/**
 * services/sync.ts
 * Orquestrador de Sincronização Bidirecional (Local <-> Cloudflare).
 */

import { config } from '../infra/config';
import { runSql, allSql } from '../infra/db';
import { WorkerApi } from './worker-endpoint';
import { leitoresAtivos } from './poller';

let estaSincronizando = false;

/** Ciclo principal de sincronização periódica (Background Polling) */
export function iniciarSync() {
  sincronizarCacheAlunos();
  sincronizarRegistrosPendentes();
  
  // Heartbeat inicial
  const statusBoot = leitoresAtivos.map(l => ({
      id: l.id,
      nome: l.nome,
      online: (l as any).online || false
  }));
  WorkerApi.enviarStatus(statusBoot);
  
  // Cache de Alunos (15s)
  setInterval(async () => {
    try { await sincronizarCacheAlunos(); } catch (e) { console.error('[Sync] Falha cache:', e); }
  }, 15 * 1000);

  // Batidas Pendentes (10s)
  setInterval(async () => {
    try { await sincronizarRegistrosPendentes(); } catch (e) { console.error('[Sync] Falha registros:', e); }
  }, 10 * 1000);

  // Status/Heartbeat (30s)
  setInterval(() => {
    const statusLimpo = leitoresAtivos.map(l => ({
        id: l.id,
        nome: l.nome,
        online: (l as any).online || false
    }));
    WorkerApi.enviarStatus(statusLimpo);
  }, 30 * 1000);

  sincronizarRegistrosPendentes();
  sincronizarCacheAlunos();
}

/** Envia batidas offline para a nuvem */
async function sincronizarRegistrosPendentes() {
  const pendentes = await allSql(`SELECT * FROM registros_acesso WHERE sincronizado = 0 LIMIT 100`);
  if (pendentes.length === 0) return;

  console.log(`[Sync] Enviando ${pendentes.length} registros offline...`);
  const ok = await WorkerApi.enviarBatida(pendentes);

  if (ok) {
    for (const p of pendentes) {
      await runSql('UPDATE registros_acesso SET sincronizado = 1 WHERE id = ?', [p.id]);
    }
  }
}

/** Baixa novos alunos e biometria da nuvem para o cache local */
export async function sincronizarCacheAlunos() {
  if (estaSincronizando) return;
  estaSincronizando = true;
  
  try {
    const urlSync = `${config.endpoint_worker}/api/agente/download-alunos`;
    console.log(`[Sync] Conectando ao servidor: ${urlSync}`);
    const resposta = await WorkerApi.buscarSincronizacaoAlunos();
    
    if (!resposta || !resposta.ok) {
        console.warn('[Sync] Falha ao contatar servidor de sincronização.');
        return;
    }

    const { alunos: alunosServidor, configuracoes: configs } = resposta;
    console.log(`[Sync] Configurações recebidas:`, JSON.stringify(configs));

    // 1. Atualizar Configurações da Unidade
    if (configs) {
        for (const [chave, rawValor] of Object.entries(configs)) {
            if (rawValor === undefined || rawValor === null) continue;
            
            const valor = typeof rawValor === 'object' ? JSON.stringify(rawValor) : String(rawValor);
            console.log(`[Sync][Config] Gravando DB local: ${chave} = ${valor}`);

            await runSql(`
                REPLACE INTO configuracoes_unidade (chave, valor, atualizado_em)
                VALUES (?, ?, datetime('now', 'localtime'))
            `, [chave, valor]);
        }
        console.log('[Sync] Configurações de unidade atualizadas ✓');
    }

    // 2. Atualizar cache de alunos
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

    console.log(`[Sync] Cache local sincronizado para ${alunosServidor.length} alunos.`);
  } catch (e) {
    console.error('[Sync] Falha grave na sincronização:', e);
  } finally {
    estaSincronizando = false;
  }
}
