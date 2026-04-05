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

// Controle de Backoff (para não inundar o hardware se ele cair)
const falhasLeitores = new Map<string, { contador: number, proximaTentativa: number }>();

/** Inicializa o monitoramento de todos os leitores configurados */
export function iniciarPolling(notificador: any) {
  // ⚡ Carrega os leitores da config se a lista estiver vazia
  if (leitoresAtivos.length === 0 && config.leitores) {
     leitoresAtivos = (config.leitores as any[]).map(c => new IdflexLeitor(c));
  }

  notificadorGlobal = notificador;
  
  console.log(`[Poller] Iniciando monitoramento para ${leitoresAtivos.length} equipamentos.`);
  
  // Ciclo Principal de Polling (Frequência: 2s)
  setInterval(() => {
    leitoresAtivos.forEach(leitor => monitorarLeitor(leitor));
  }, 2000);
}

/** Recarrega a lista de leitores (Ex: mudança de IP no dashboard) */
export function recarregarLeitores(novaLista: ILeitor[] = []) {
    if (novaLista.length > 0) leitoresAtivos = novaLista;
    console.log(`[Poller] Lista de leitores atualizada (${leitoresAtivos.length} ativos).`);
}

/** Fluxo de monitoramento individual por equipamento */
async function monitorarLeitor(leitor: ILeitor) {
  const agora = Date.now();
  const falha = falhasLeitores.get(leitor.id);
  
  if (falha && agora < falha.proximaTentativa) return;

  try {
    // 1. Verificar/Reativar Integridade do Modo Escola (Watchdog) a cada 5 min
    const tagCheck = `last_watchdog_${leitor.id}`;
    
    // Atualiza o estado vivo do leitor a cada ciclo (Isso aparece na UI)
    const st = await leitor.status();
    (leitor as any).online = st.online;
    (leitor as any).totalUsuarios = st.totalUsuarios;

    if (!(global as any)[tagCheck] || (agora - (global as any)[tagCheck] > 5 * 60 * 1000)) {
        const ipLocal = buscarIpLocal();
        if (ipLocal) {
            console.log(`[Watchdog][${leitor.id}] Sincronizando Modo Push (Real-Time)...`);
            // Ativa o Push (Modo Escola)
            await (leitor as any).configurarModoEscola(ipLocal);
            // Sincroniza Marca de Watchdog
            (global as any)[tagCheck] = agora;
        }
    }

    // 2. Buscar último ID lido para este leitor
    const cursor = await getSql(`SELECT ultimo_evento_id FROM cursores_leitura WHERE leitor_id = ?`, [leitor.id]);
    let maxId = cursor?.ultimo_evento_id;

    // ⚡ FIRST BOOT: Se não existe cursor, pergunta ao leitor qual o ID atual e marca como início
    if (maxId === undefined) {
        console.log(`[Poller] Inicializando leitura para ${leitor.id}. Marcando ponto de partida atual...`);
        const novoMax = await (leitor as any).buscarUltimoIdLog();
        await runSql(`INSERT INTO cursores_leitura (leitor_id, ultimo_evento_id) VALUES (?, ?)`, [leitor.id, String(novoMax)]);
        return; // Pula a coleta neste ciclo para começar do zero no próximo
    }

    // 3. Buscar novos eventos (Fallback se o Push falhar ou rede oscilar)
    const eventos: EventoAcesso[] = await leitor.buscarEventos(maxId);
    
    if (eventos.length > 0) {
      console.log(`[Poller] ${leitor.nome}: Coletou ${eventos.length} novas presenças.`);
      
      for (const ev of eventos) {
        const matriculaParaBusca = ev.matricula || ev.idUsuario;
        const aluno = await getSql('SELECT nome_completo FROM alunos_cache WHERE matricula = ?', [matriculaParaBusca]);
        const nomeAcesso = aluno?.nome_completo || ev.nomeHardware || `DESCONHECIDO (${ev.idUsuario})`;
        const statusAcesso = ev.autorizado ? ev.tipo : 'NEGADO';

        // 1. Atualiza estatísticas em memória do Agente (Para aparecer na telinha local)
        stats.registrarAcesso(nomeAcesso, String(matriculaParaBusca), statusAcesso);

        // 2. GRAVA A BATIDA FISICAMENTE NO BANCO (Para que o Sync possa enviar para a Cloudflare)
        await runSql(`
            INSERT INTO registros_acesso (id, leitor_id, escola_id, matricula, nome, tipo, autorizado, sincronizado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `, [
            `EV-${ev.id}-${Date.now()}`, // ID único da batida
            leitor.id,
            config.escola_id,
            String(matriculaParaBusca),
            nomeAcesso,
            statusAcesso,
            ev.autorizado ? 1 : 0
        ]);
        
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
  }
}
