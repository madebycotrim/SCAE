/**
 * services/sync.ts
 * Orquestrador de Sincronização Bidirecional (Local <-> Cloudflare).
 * Versão Assíncrona (SQLite3).
 */

import { config } from '../infra/config';
import { runSql, allSql } from '../infra/db';
import { WorkerApi } from './worker-endpoint';
import { leitoresAtivos } from './poller';
import { DadosAluno } from '../drivers/ILeitor';

/** Inicia os intervalos de sincronização */
export function iniciarSync() {
  console.log('[Sync] Iniciando orquestrador de sincronização...');

  // Sincronização de saída (Registros de acesso - a cada 5 segundos)
  setInterval(async () => {
    try {
      await sincronizarRegistrosPendentes();
    } catch (e) {
      console.error('[Sync] Falha na sincronização de saída:', e);
    }
  }, config.intervalo_sync_ms);

  // Sincronização de entrada (Cache de Alunos - a cada 30 minutos)
  setInterval(async () => {
    try {
      await sincronizarCacheAlunos();
    } catch (e) {
      console.error('[Sync] Falha na atualização do cache de alunos:', e);
    }
  }, 30 * 60 * 1000);

  // Heartbeat de status (A cada 1 minuto)
  setInterval(() => WorkerApi.enviarStatus([]), 60 * 1000);

  // Execução inicial
  sincronizarRegistrosPendentes();
  sincronizarCacheAlunos();
  WorkerApi.enviarStatus([]);
}

/** Varre o SQLite local em busca de batidas ainda não enviadas para a nuvem */
async function sincronizarRegistrosPendentes() {
  const pendentes = await allSql(`
    SELECT * FROM registros_acesso 
    WHERE sincronizado = 0 
    ORDER BY timestamp_acesso ASC 
    LIMIT 100
  `);

  if (pendentes.length === 0) return;

  console.log(`[Sync] Enviando lote de ${pendentes.length} registros para a Cloudflare...`);

  // Enviar para o Worker API
  const ok = await WorkerApi.enviarBatida(pendentes);

  if (ok) {
    // Marcar como sincronizados para não enviar novamente
    for (const p of pendentes) {
      await runSql('UPDATE registros_acesso SET sincronizado = 1 WHERE id = ?', [p.id]);
    }
    console.log('[Sync] Lote sincronizado com sucesso ✓');
  }
}

/** Baixa novos alunos e biometria da nuvem para o cache local */
async function sincronizarCacheAlunos() {
  console.log('[Sync] Atualizando cache local de alunos e biometria...');
  
  const alunosServidor = await WorkerApi.buscarSincronizacaoAlunos();
  if (!alunosServidor || alunosServidor.length === 0) return;

  // Atualizar cache via Upsert e injetar no Hardware
  for (const a of alunosServidor) {
    await runSql(`
      INSERT INTO alunos_cache (matricula, escola_id, nome_completo, turma_id, ativo)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(matricula, escola_id) DO UPDATE SET
        nome_completo = excluded.nome_completo,
        turma_id = excluded.turma_id,
        ativo = excluded.ativo,
        atualizado_em = datetime('now', 'localtime')
    `, [a.matricula, config.escola_id, a.nome_completo, a.turma_id, a.ativo]);

    // Injetar nos leitores físicos se o aluno estiver ativo
    if (a.ativo && leitoresAtivos.length > 0) {
      const dados: DadosAluno = { matricula: a.matricula, nomeCompleto: a.nome_completo };
      for (const leitor of leitoresAtivos) {
        try {
          await leitor.cadastrarAluno(dados);
        } catch (e) {
          console.error(`[Sync] Erro ao cadastrar aluno ${a.matricula} no leitor ${leitor.id}:`, e);
        }
      }
    } else if (!a.ativo && leitoresAtivos.length > 0) {
       // Remover do hardware se inativado na nuvem
       for (const leitor of leitoresAtivos) {
         try { await leitor.removerAluno(a.matricula); } catch {}
       }
    }
  }

  console.log(`[Sync] Cache local sincronizado e injetado no hardware para ${alunosServidor.length} alunos.`);
}
