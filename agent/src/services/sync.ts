/**
 * services/sync.ts
 * Orquestrador de Sincronização Bidirecional (Local <-> Cloudflare).
 */

import { config } from '../infra/config';
import { runSql, allSql } from '../infra/db';
import { WorkerApi } from './worker-endpoint';
import { leitoresAtivos } from './poller';

let estaSincronizando = false;

export function iniciarSync() {
  sincronizarCacheAlunos();
  sincronizarRegistrosPendentes();
  
  const statusBoot = leitoresAtivos.map(l => ({
      id: l.id,
      nome: l.nome,
      online: (l as any).online || false
  }));
  WorkerApi.enviarStatus(statusBoot);
  
  setInterval(async () => {
    try { await sincronizarCacheAlunos(); } catch (e) { console.error('[Sync] Falha cache:', e); }
  }, 15 * 1000);

  setInterval(async () => {
    try { await sincronizarRegistrosPendentes(); } catch (e) { console.error('[Sync] Falha registros:', e); }
  }, 10 * 1000);

  setInterval(() => {
    const statusLimpo = leitoresAtivos.map(l => ({
        id: l.id,
        nome: l.nome,
        online: (l as any).online || false
    }));
    WorkerApi.enviarStatus(statusLimpo);
  }, 30 * 1000);
}

/**
 * Envia as presenças coletadas localmente para o sistema web (Cloudflare)
 */
async function sincronizarRegistrosPendentes() {
  const pendentes = await allSql(`SELECT * FROM registros_acesso WHERE sincronizado = 0 LIMIT 50`);
  
  if (pendentes.length > 0) {
    console.log(`[Sync] Detectado ${pendentes.length} batidas pendentes. Enviando para Cloudflare...`);
    
    // Tenta enviar para a Nuvem através do WorkerApi
    const ok = await WorkerApi.enviarBatida(pendentes);
    
    if (ok) {
      console.log(`[Sync] ✓ SUCESSO: ${pendentes.length} batidas enviadas aos sistema web.`);
      for (const p of pendentes) {
        await runSql('UPDATE registros_acesso SET sincronizado = 1 WHERE id = ?', [p.id]);
      }
    } else {
      console.warn(`[Sync] ! FALHA: Erro ao enviar batidas para a rede. Tentando novamente em breve...`);
    }
  }
}

export async function sincronizarCacheAlunos() {
  if (estaSincronizando) return;
  estaSincronizando = true;
  
  try {
    const urlSync = `${config.endpoint_worker}/api/agente/download-alunos`;
    console.log(`[Sync] Verificando nuvem: ${urlSync}`);
    const resposta = await WorkerApi.buscarSincronizacaoAlunos();
    
    if (!resposta || !resposta.ok) return;

    const { alunos: alunosServidor } = resposta;

    // Atualizar cache de alunos
    for (const a of (alunosServidor as any[])) {
        await runSql(`
            INSERT INTO alunos_cache (matricula, escola_id, nome_completo, turma_id, ativo)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(matricula, escola_id) DO UPDATE SET
                nome_completo = excluded.nome_completo,
                turma_id = excluded.turma_id,
                ativo = excluded.ativo,
                atualizado_em = datetime('now', 'localtime')
        `, [a.matricula, config.escola_id, a.nome_completo, a.turma_id, a.ativo]);
    }

    console.log(`[Sync] Cache local sincronizado (${alunosServidor.length} alunos).`);
  } catch (e) {
    console.error('[Sync] Falha:', e);
  } finally {
    estaSincronizando = false;
  }
}
