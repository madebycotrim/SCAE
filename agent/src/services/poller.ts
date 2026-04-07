/**
 * services/poller.ts
 * Monitoramento contínuo (Watchdog) e Polling de Hardwares iDFlex.
 * Mantém a integridade do Modo Escola e busca logs offline se necessário.
 */

import { ILeitor, EventoAcesso } from '../drivers/ILeitor';
import { runSql, getSql } from '../infra/db';
import { stats } from '../infra/stats';

import { buscarIpLocal } from '../utils/rede';
import { IdflexLeitor } from '../drivers/IdflexLeitor';
import { config } from '../infra/config';

// Lista de leitores em monitoramento
export let leitoresAtivos: ILeitor[] = [];
let notificadorGlobal: any = null;

// Controle de Backoff e Travas de Execução (Lock)
const falhasLeitores = new Map<string, { contador: number, proximaTentativa: number }>();
const leitoresEmProcessamento = new Set<string>();

/** Inicializa o monitoramento de todos os leitores configurados */
export function iniciarPolling(notificador: any) {
  // ⚡ SEGURO: Garante que os leitores estejam carregados se ainda não estiverem
  verificarEInicializarLeitores();

  notificadorGlobal = notificador;
  console.log(`[Poller] Motores de coleta (Polling) ATIVADOS para ${leitoresAtivos.length} equipamentos.`);
}

/** 
 * Garante que a lista de equipamentos configurados esteja na memória.
 * Chamado pelo monitor de status antes mesmo da ativação total do sistema.
 */
export function verificarEInicializarLeitores() {
  if (leitoresAtivos.length === 0 && config.leitores) {
    const list = (config.leitores as any[]).map(c => {
        const l = new IdflexLeitor(c);
        (l as any).online = 'verificando'; // Estado inicial neutro
        return l;
    });
    leitoresAtivos = list;
    console.log(`[Poller] Hardware carregado: ${leitoresAtivos.length} equipamentos em radar.`);
  }
}

// Ciclo Principal de Monitoramento (WATCHDOG) - Roda SEMPRE
function executarCicloMonitoramento() {
    // Carrega se sumir
    verificarEInicializarLeitores();
    // Monitora individualmente cada leitor
    leitoresAtivos.forEach(leitor => monitorarLeitor(leitor));
}

// Inicia imediatamente e depois repete
executarCicloMonitoramento();
setInterval(executarCicloMonitoramento, 2000);

/** Recarrega a lista de leitores (Ex: mudança de IP no dashboard) */
export function recarregarLeitores(novaLista: ILeitor[] = []) {
    if (novaLista.length > 0) {
        leitoresAtivos = novaLista;
    } else {
        // Se chamado sem lista, força a reconstrução a partir da config global atualizada
        const { IdflexLeitor } = require('../drivers/IdflexLeitor');
        const { config } = require('../infra/config');
        leitoresAtivos = (config.leitores as any[]).map(c => new IdflexLeitor(c));
    }
    console.log(`[Poller] Lista de leitores atualizada (${leitoresAtivos.length} ativos).`);
}

/** Tenta forçar a reconexão imediata de um leitor específico (Manual via UI) */
export async function recarregarLeitorEspecifico(leitorId: string) {
    const leitor = leitoresAtivos.find(l => l.id === leitorId);
    if (!leitor) return { ok: false, erro: 'Leitor não encontrado no radar.' };
    
    // Zera o backoff de falhas para forçar a tentativa agora mesmo
    falhasLeitores.delete(leitorId);
    console.log(`[Poller] Forçando reconexão manual: ${leitor.nome} (${leitor.id})...`);
    
    try {
        const st = await leitor.status();
        (leitor as any).online = st.online;
        (leitor as any).totalUsuarios = st.totalUsuarios;
        
        // Se estiver online, já aproveita para re-sincronizar o Modo Push imediatamente
        if (st.online) {
            const { buscarIpLocal } = require('../utils/rede');
            const ipLocal = config.ip_agente || buscarIpLocal();
            if (ipLocal) {
                await (leitor as any).configurarModoEscola(ipLocal);
                console.log(`[Poller] ✓ ${leitor.nome} RECONECTADO EM ${ipLocal}.`);
            }
        }
        
        return { ok: st.online };
    } catch (e: any) {
        console.error(`[Poller] Falha ao reconectar ${leitor.id}:`, e.message);
        return { ok: false, erro: e.message };
    }
}

async function monitorarLeitor(leitor: ILeitor) {
  // ⚡ LOCK PREVENTION: Evita que o mesmo leitor seja processado em paralelo se a varredura anterior demorar.
  // Isso era a causa principal de logs triplicados (Race Condition no Cursor de Leitura).
  if (leitoresEmProcessamento.has(leitor.id)) return;
  
  const agora = Date.now();
  const falha = falhasLeitores.get(leitor.id);
  if (falha && agora < falha.proximaTentativa) return;

  leitoresEmProcessamento.add(leitor.id);

  try {
    // 1. Verificar/Reativar Integridade do Modo Escola (Watchdog) a cada 5 min
    const tagCheck = `last_watchdog_${leitor.id}`;
    
    // Atualiza o estado vivo do leitor a cada ciclo (Isso aparece na UI)
    const st = await leitor.status();
    const estadoAnterior = (leitor as any).online;

    if (st.online) {
        (leitor as any).online = true;
        (leitor as any).totalUsuarios = st.totalUsuarios;
    } else {
        // Só marca como Offline (false) se ele já foi detectado alguma vez (true)
        // Se ainda está em 'verificando', mantém lá para não disparar alerta falso
        if (estadoAnterior === true) {
            (leitor as any).online = false;
        }
    }

    if (!(global as any)[tagCheck] || (agora - (global as any)[tagCheck] > 5 * 60 * 1000)) {
        const ipLocal = config.ip_agente || buscarIpLocal();
        if (ipLocal) {
            console.log(`[Watchdog][${leitor.id}] Sincronizando Modo Push em ${ipLocal}...`);
            // Ativa o Push (Modo Escola)
            await (leitor as any).configurarModoEscola(ipLocal);
            // Sincroniza Marca de Watchdog
            (global as any)[tagCheck] = agora;
        }
    }

    // 2. Buscar último ID lido para este leitor
    const cursor = await getSql(`SELECT ultimo_evento_id FROM cursores_leitura WHERE leitor_id = ?`, [leitor.id]);
    
    // ⚡ FIRST BOOT: Se não existe cursor no banco, pergunta ao hardware qual o ID de log mais recente
    // e salva como o nosso ponto de partida. Não coletamos nada que veio antes disso.
    if (!cursor) {
        console.log(`[Poller] Banco novo detectado. Inicializando cursor para ${leitor.id}...`);
        const novoMax = await leitor.buscarUltimoIdLog();
        await runSql(`INSERT INTO cursores_leitura (leitor_id, ultimo_evento_id) VALUES (?, ?)`, [leitor.id, String(novoMax)]);
        console.log(`[Poller] Ponto Zero definido no ID: ${novoMax}. Ignorando histórico anterior.`);
        return; // IMPORTANTE: Encerra aqui para garantir que o próximo ciclo use este ID como base
    }

    let maxId = cursor.ultimo_evento_id;

    // 3. Buscar novos eventos (Fallback se o Push falhar ou rede oscilar)
    const eventos: EventoAcesso[] = await leitor.buscarEventos(maxId);
    
    if (eventos.length > 0) {
      console.log(`[Poller] ${leitor.nome}: Coletou ${eventos.length} novas presenças.`);
      
        for (const ev of eventos) {
        const matriculaParaBusca = ev.matricula || ev.idUsuario;
        const aluno = await getSql('SELECT nome_completo, turma_id, turno FROM alunos_cache WHERE matricula = ?', [matriculaParaBusca]);
        
        const { classificarAcesso } = require('./classificador');
        const classificacao = classificarAcesso(String(matriculaParaBusca), aluno?.turno);

        const nomeAcesso = aluno?.nome_completo || ev.nomeHardware || `DESCONHECIDO (${ev.idUsuario})`;
        const turmaAcesso = aluno?.turma_id || '---';
        const statusAcesso = ev.autorizado ? classificacao.tipo : 'NEGADO';
        const detalheAcesso = classificacao.mensagem;

        // --- GRAVAÇÃO DETERMINÍSTICA (Source of Truth) ---
        // Usamos um ID baseado no ID real do hardware para evitar duplicatas reais
        const idUnico = `HW-${leitor.id}-${ev.id}`;
        
        try {
            await runSql(`
                INSERT INTO registros_acesso (id, leitor_id, escola_id, matricula, nome, tipo, autorizado, sincronizado)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            `, [
                idUnico,
                leitor.id,
                config.escola_id,
                String(matriculaParaBusca),
                nomeAcesso,
                statusAcesso,
                ev.autorizado ? 1 : 0
            ]);

            // ⚡ SÓ PROCESSA SE FOR UM REGISTRO NOVO (Não duplicado)
            // Isso garante que o Poling não gere logs repetidos se o Push já disparou

            // 1. Atualiza estatísticas em memória do Agente (Gráfico e Métricas)
            stats.registrarAcesso(nomeAcesso, String(matriculaParaBusca), statusAcesso, turmaAcesso);

            // 2. Notifica o Front-End para atualizar a UI e tocar o som (TTS)
            if (notificadorGlobal) {
                notificadorGlobal.webContents.send('new-access', {
                    nome: matriculaParaBusca === '0' ? nomeAcesso : `${nomeAcesso} (${matriculaParaBusca})`,
                    nomePuro: nomeAcesso,
                    turma: turmaAcesso,
                    matricula: String(matriculaParaBusca),
                    sucesso: statusAcesso !== 'NEGADO' && statusAcesso !== 'TURNO_ERRADO' && statusAcesso !== 'FORA_DE_HORARIO',
                    statusAcesso,
                    detalhe: detalheAcesso,
                    ttsAtivo: config.tts_ativado,
                    ttsParams: {
                        sucesso: config.tts_sucesso ?? 'Bem-vindo, {nome}!',
                        erro: config.tts_erro ?? 'Acesso negado, {nome}!'
                    }
                });
            }
        } catch (e: any) {
            // Se o erro for de restrição de chave única (Unique Constraint), apenas ignoramos 
            // pois significa que esse log já foi processado anteriormente.
            if (!e.message.includes('UNIQUE')) {
                console.error(`[Poller] Erro ao inserir log ${idUnico}:`, e.message);
            }
        }
        
        const idNum = parseInt(ev.id, 10);
        if (!isNaN(idNum) && idNum > parseInt(maxId, 10)) maxId = ev.id;
      }

      await runSql(`
        INSERT INTO cursores_leitura (leitor_id, ultimo_evento_id)
        VALUES (?, ?)
        ON CONFLICT(leitor_id) DO UPDATE SET ultimo_evento_id = excluded.ultimo_evento_id
      `, [leitor.id, maxId]);
    }

    // Reset de falhas se chegou aqui com sucesso
    falhasLeitores.delete(leitor.id);

  } catch (e: any) {
    const contador = (falha?.contador || 0) + 1;
    const delay = Math.min(5000 * Math.pow(2, contador - 1), 60000);
    falhasLeitores.set(leitor.id, { contador, proximaTentativa: agora + delay });
    
    if (e.code !== 'ECONNREFUSED' && e.code !== 'ETIMEDOUT') {
        console.error(`[Poller] Falha no leitor ${leitor.id}:`, e.message);
    }
  } finally {
      // Libera o leitor para a próxima varredura
      leitoresEmProcessamento.delete(leitor.id);
  }
}
