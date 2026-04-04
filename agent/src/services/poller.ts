/**
 * services/poller.ts
 * Monitoramento contínuo (Watchdog) e Polling de Hardwares iDFlex.
 * Mantém a integridade do Modo Escola e busca logs offline se necessário.
 */

import { ILeitor, EventoAcesso } from '../drivers/ILeitor';
import { runSql, getSql } from '../infra/db';
import { stats } from '../infra/stats';
import { NotificadorVoz } from './notificador-voz';
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
    let maxId = cursor?.ultimo_evento_id || '0';

    // 3. Buscar novos eventos (Fallback se o Push falhar ou rede oscilar)
    const eventos: EventoAcesso[] = await leitor.buscarEventos(maxId);
    
    if (eventos.length > 0) {
      console.log(`[Poller] ${leitor.nome}: Coletou ${eventos.length} novas presenças.`);
      
      for (const ev of eventos) {
        if (notificadorGlobal) {
          const matriculaParaBusca = ev.matricula || ev.idUsuario;
          const aluno = await getSql('SELECT nome_completo FROM alunos_cache WHERE matricula = ?', [matriculaParaBusca]);
          
          if (aluno?.nome_completo) {
            notificadorGlobal.anunciarAcesso(`${aluno.nome_completo}`, ev.tipo);
            stats.registrarAcesso(aluno.nome_completo, String(matriculaParaBusca), ev.tipo);
          } else {
            const statusAcesso = ev.autorizado ? ev.tipo : 'NEGADO';
            const nomeExibicao = ev.nomeHardware || `DESCONHECIDO (${ev.idUsuario})`;
            notificadorGlobal.anunciarAcesso(nomeExibicao, statusAcesso);
            stats.registrarAcesso(nomeExibicao, String(ev.idUsuario), statusAcesso);
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
  }
}
