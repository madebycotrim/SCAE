/**
 * services/sync.ts
 * Gestor de sincronização bidirecional Agente-Cloud.
 */

import { getDb } from '../infra/db';
import { WorkerApi } from './worker-endpoint';
import { config } from '../infra/config';

let syncInativo = false;

/** Inicia loops de sincronização com o Worker central */
export async function iniciarSync() {
  console.log(`[Sync] Sincronização automática ativa a cada ${config.intervalo_sync_ms}ms.`);
  
  // Sincronização de saída (Registros de acesso pendentes)
  setInterval(sincronizarRegistrosPendentes, config.intervalo_sync_ms);

  // Sincronização de entrada (Cache de Alunos - a cada 30 minutos)
  setInterval(sincronizarCacheAlunos, 30 * 60 * 1000);

  // Heartbeat de status (A cada 1 minuto)
  setInterval(() => WorkerApi.enviarStatus([]), 60 * 1000);

  // Execução inicial
  sincronizarRegistrosPendentes();
  sincronizarCacheAlunos();
  WorkerApi.enviarStatus([]);
}

/** Varre o SQLite local em busca de batidas ainda não enviadas para a nuvem */
async function sincronizarRegistrosPendentes() {
  if (syncInativo) return;
  const db = getDb();
  
  try {
    const pendencias = db.prepare('SELECT * FROM registros_acesso WHERE sincronizado = 0 LIMIT 100').all() as any[];
    
    if (pendencias.length === 0) return;

    console.log(`[Sync] Enviando lote de ${pendencias.length} registros para o servidor...`);
    
    // Tentativa de envio para a Cloudflare
    const ok = await WorkerApi.enviarBatida(pendencias);
    
    if (ok) {
      // Marcar como sincronizado individualmente para evitar conflitos de lote
      const updateSync = db.prepare('UPDATE registros_acesso SET sincronizado = 1 WHERE id = ?');
      db.transaction((ids: string[]) => {
        for (const id of ids) updateSync.run(id);
      })(pendencias.map(p => p.id));
      
      console.log(`[Sync] ${pendencias.length} registros confirmados na nuvem ✓`);
    }

  } catch (e) {
    console.warn('[Sync] Falha no ciclo de sincronização de saída:', (e as Error).message);
  }
}

/** Baixa base de alunos atualizada para permitir reconhecimento biométrico offline */
async function sincronizarCacheAlunos() {
  try {
    const alunosServidor = await WorkerApi.buscarSincronizacaoAlunos();
    if (alunosServidor.length === 0) return;

    const db = getDb();
    const upsertAluno = db.prepare(`
      INSERT INTO alunos_cache (matricula, escola_id, nome_completo, turma_id, ativo, vetor_facial)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(matricula, escola_id) DO UPDATE SET
        nome_completo = excluded.nome_completo,
        turma_id = excluded.turma_id,
        ativo = excluded.ativo,
        vetor_facial = excluded.vetor_facial,
        atualizado_em = datetime('now', 'localtime')
    `);

    db.transaction((alunos: any[]) => {
      for (const a of alunos) {
        upsertAluno.run(a.matricula, config.escola_id, a.nome_completo, a.turma_id, a.ativo, a.vetor_facial);
      }
    })(alunosServidor);

    console.log(`[Sync] Cache local atualizado com ${alunosServidor.length} alunos da escola.`);
  } catch (e) {
    console.error('[Sync] Falha na atualização do banco de dados de alunos:', e);
  }
}
