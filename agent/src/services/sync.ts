/**
 * services/sync.ts
 * Orquestrador de Sincronização Bidirecional (Local <-> Cloudflare).
 */

import { config } from '../infra/config';
import { runSql, allSql } from '../infra/db';
import { WorkerApi } from './worker-endpoint';
import { leitoresAtivos } from './poller';

let estaSincronizando = false;
let estaSincronizandoBatidas = false; // Bloqueio para evitar acúmulo se a internet/nuvem estiver lenta

export async function iniciarSync() {
  console.log('[Sync] Iniciando motores de sincronização...');

  // 1. Handshake de Identidade (Auto-Discovery)
  if (config.escola_id === 'aguardando-identidade') {
    try {
        const resp = await WorkerApi.descobrirIdentidade();
        if (resp && resp.ok && resp.identidade) {
            const { id, nome_escola, tts_ativado, config_tts_frase_sucesso, config_tts_frase_erro } = resp.identidade;
            
            config.escola_id = id;
            config.nome_escola = nome_escola;
            config.tts_ativado = Number(tts_ativado) === 1;
            config.tts_sucesso = config_tts_frase_sucesso;
            config.tts_erro = config_tts_frase_erro;

            console.log(`[Sync] 🔑 IDENTIDADE CONECTADA: ${nome_escola.toUpperCase()}`);
            console.log(`[Sync] 🔊 TTS INICIAL: ${config.tts_ativado ? 'ATIVADO' : 'DESATIVADO'}`);
        }
    } catch (e) {
        console.error('[Sync] Falha no Handshake de identidade:', e);
    }
  }

  sincronizarCacheAlunos();
  sincronizarRegistrosPendentes();
  
  const statusBoot = leitoresAtivos.map(l => ({
      id: l.id,
      nome: l.nome,
      online: (l as any).online || false
  }));
  WorkerApi.enviarStatus(statusBoot);
  
  setInterval(async () => {
    try { 
        if (config.escola_id === 'aguardando-identidade') {
            await iniciarSync(); // Tenta o Handshake novamente
            return;
        }
        await sincronizarCacheAlunos(); 
    } catch (e) { console.error('[Sync] Falha cache:', e); }
  }, 15 * 1000);

  setInterval(async () => {
    try { 
        if (config.escola_id === 'aguardando-identidade') return;
        await sincronizarRegistrosPendentes(); 
    } catch (e) { console.error('[Sync] Falha registros:', e); }
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
  if (estaSincronizandoBatidas) return; // Se a última ainda não terminou, aborta essa tentativa silenciosamente
  
  const pendentes = await allSql(`SELECT * FROM registros_acesso WHERE sincronizado = 0 LIMIT 50`);
  
  if (pendentes.length > 0) {
    estaSincronizandoBatidas = true;
    console.log(`[Sync] Detectado ${pendentes.length} batidas pendentes. Enviando para Cloudflare...`);
    
    // Tenta enviar para a Nuvem através do WorkerApi
    const ok = await WorkerApi.enviarBatida(pendentes);
    
    if (ok) {
      console.log(`[Sync] ✓ SUCESSO: ${pendentes.length} batidas enviadas aos sistema web.`);
      for (const p of pendentes) {
        await runSql('UPDATE registros_acesso SET sincronizado = 1 WHERE id = ?', [p.id]);
      }
    } else {
      console.warn(`[Sync] ! FALHA: Erro ao enviar batidas para a rede. Tentando novamente em 10s...`);
    }
    
    estaSincronizandoBatidas = false;
  }
}

let ultimaConfigHash = '';

export async function sincronizarCacheAlunos() {
  if (estaSincronizando) return;
  
  // 🛡️ PROTEÇÃO: Não tenta baixar nada se não souber quem é (ID Padrão)
  if (!config.escola_id || config.escola_id === 'aguardando-identidade') {
    return;
  }

  estaSincronizando = true;
  
  try {
    const resposta = await WorkerApi.buscarSincronizacaoAlunos();
    if (!resposta || !resposta.ok) return;

    const { alunos: alunosServidor, escola_config } = resposta;

    // Atualiza Configurações Globais (Nome, TTS, etc)
    if (escola_config) {
        const configHash = JSON.stringify(escola_config);
        
        // Log Detalhado do que foi recebido (Sempre que houver mudança ou Sync-Now)
        if (configHash !== ultimaConfigHash) {
            console.log("--------------------------------------------------");
            console.log("[Sync] 🌐 PACOTE DE DADOS RECEBIDO DA NUVEM:");
            console.log(` -> Escola: ${escola_config.nome_escola}`);
            console.log(` -> Alunos na Nuvem: ${alunosServidor?.length || 0}`);
            console.log(` -> Voz (TTS): ${Number(escola_config.tts_ativado) === 1 ? 'LIGADO' : 'DESLIGADO'}`);
            console.log(` -> Msg Sucesso (Web): "${escola_config.config_tts_frase_sucesso || 'Padrão'}"`);
            console.log(` -> Msg Erro (Web): "${escola_config.config_tts_frase_erro || 'Acesso negado.'}"`);
            console.log("--------------------------------------------------");

            // Sincronização de Atributos com o Global Config (Verdade Absoluta da Nuvem)
            const ttsAntes = config.tts_ativado;
            const sucessoAntes = config.tts_sucesso;
            const erroAntes = config.tts_erro;

            config.nome_escola = escola_config.nome_escola;
            config.tts_ativado = Number(escola_config.tts_ativado) === 1;
            config.tts_sucesso = escola_config.config_tts_frase_sucesso;
            config.tts_erro = escola_config.config_tts_frase_erro;
            
            if (ttsAntes !== config.tts_ativado || sucessoAntes !== config.tts_sucesso || erroAntes !== config.tts_erro) {
                console.log(`[Sync] 🔗 CONVERGÊNCIA: Divergência detectada! O Agente Local foi atualizado para os padrões WEB.`);
                console.log(` -> Sucesso: "${config.tts_sucesso}"`);
                console.log(` -> Erro: "${config.tts_erro}"`);
            }

            ultimaConfigHash = configHash;

            // Avisa a UI (Frontend) sobre a mudança
            const { avisarMudancaConfig } = require('../main/main');
            avisarMudancaConfig();
        }
    }

    // 2. Sincronização de Alunos (Log só se houver mudança)
    if (alunosServidor && alunosServidor.length !== config.total_alunos) {
        console.log(`[Sync] 📥 MUDANÇA DETECTADA: Sincronizando ${alunosServidor.length} alunos com o cache local.`);
        
        for (const a of (alunosServidor as any[])) {
            await runSql(`
                INSERT INTO alunos_cache (matricula, escola_id, nome_completo, turma_id, ativo)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(matricula, escola_id) DO UPDATE SET
                    nome_completo = excluded.nome_completo,
                    turma_id = excluded.turma_id,
                    ativo = excluded.ativo,
                    atualizado_em = datetime('now', 'localtime')
            `, [a.matricula, config.escola_id, a.nome_completo, a.turma_id, a.ativo === 1 ? 1 : 0]);
        }

        config.total_alunos = alunosServidor.length;
        console.log(`[Sync] 🏁 CACHE DE ALUNOS ATUALIZADO (Total: ${config.total_alunos})`);
    }

  } catch (e: any) {
    console.error('[Sync] Falha crítica na sincronização:', e);
  } finally {
    estaSincronizando = false;
  }
}
