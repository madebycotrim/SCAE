/**
 * services/sync.ts
 * Orquestrador de Sincronização Bidirecional (Local <-> Cloudflare).
 */

import { config, salvarConfiguracaoCompleta } from '../infra/config';
import { runSql, allSql, getSql } from '../infra/db';
import { WorkerApi } from './worker-endpoint';
import { obterLeitoresAtivos } from './poller';

let estaSincronizando = false;
let estaSincronizandoBatidas = false; // Bloqueio para evitar acúmulo se a internet/nuvem estiver lenta

let motoresIniciados = false;

export async function iniciarSync() {
  if (motoresIniciados) return;
  motoresIniciados = true;

  console.log('[Sync] Iniciando motores de sincronização...');

  // 1. Tentar Handshake de Identidade (Auto-Discovery) se necessário
  if (config.escola_id === 'aguardando-identidade') {
    await tentarDescobrirIdentidade();
  }

  // 2. Dispara ciclos iniciais
  sincronizarCacheAlunos();
  sincronizarRegistrosPendentes();
  realizarLimpezaGariDigital(); // Limpeza no Boot
  
  const leitores = obterLeitoresAtivos();
  const statusBoot = leitores.map(l => ({
      id: l.id,
      nome: l.nome,
      online: (l as any).online || false
  }));
  WorkerApi.enviarStatus(statusBoot);
  
  // Ciclo 15s: Tenta descobrir identidade se ainda não tem, ou baixa alunos se já tem.
  setInterval(async () => {
    try { 
        if (config.escola_id === 'aguardando-identidade') {
            await tentarDescobrirIdentidade();
        } else {
            await sincronizarCacheAlunos();
        }
    } catch (e) { console.error('[Sync] Falha no ciclo periódico:', e); }
  }, 15 * 1000);

  // Ciclo de Sincronização Ultrarrápido (2 segundos)
  let falhasConsecutivas = 0;
  const loopSincronizacao = async () => {
    try {
        if (config.escola_id !== 'aguardando-identidade') {
            const ok = await sincronizarRegistrosPendentes();
            if (ok) {
                falhasConsecutivas = 0;
            } else {
                falhasConsecutivas++;
            }
        }
    } catch (e) {
        falhasConsecutivas++;
        console.error('[Sync] Falha registros:', e);
    }

    // Calcula o próximo delay (Base: 2s para resposta rápida | Max: 5min)
    const delayBase = 2 * 1000;
    const multiplicador = Math.min(Math.pow(2, falhasConsecutivas), 150); 
    const proximoDelay = (falhasConsecutivas === 0) ? delayBase : delayBase * multiplicador;

    setTimeout(loopSincronizacao, proximoDelay);
  };
  setTimeout(loopSincronizacao, 2000);

  // Ciclo de 24h para o Gari Digital
  setInterval(() => {
    realizarLimpezaGariDigital();
  }, 24 * 60 * 60 * 1000);

  // Ciclo Ultrarrápido (1s): Busca comandos remotos críticos (Abrir catraca, Reboot, Sync)
  setInterval(async () => {
    if (config.escola_id !== 'aguardando-identidade') {
        try {
            const resp = await fetch(`${config.endpoint_worker}/api/agente/comandos`, {
                headers: { 
                    'X-Escola-ID': config.escola_id,
                    'X-Agente-Token': config.agente_secret 
                }
            });
            if (resp.ok) {
                const { comandos } = await resp.json();
                if (comandos && comandos.length > 0) {
                    const { processarComandosNuvem } = require('./command-executor');
                    await processarComandosNuvem(comandos);
                }
            }
        } catch {}
    }
  }, 1000); // 1 segundo para comandos remotos

  // Atualização de Status Online (Dashboard de Saúde) — 5 segundos
  setInterval(() => {
    if (config.escola_id !== 'aguardando-identidade') {
        const ipLocal = config.ip_agente || require('../utils/rede').buscarIpLocal();
        const statusLimpo = {
            agente_online: true,
            ultimo_visto: new Date().toISOString(),
            ip_interno: ipLocal,
            uptime_seconds: Math.floor(process.uptime()),
            hardware: obterLeitoresAtivos().map(l => ({
                id: l.id,
                nome: l.nome,
                ip: l.ip,
                online: (l as any).online || false,
                total_usuarios: (l as any).totalUsuarios || 0
            }))
        };
        WorkerApi.enviarStatus(statusLimpo);
    }
  }, 5000);
}

/** 
 * Tenta buscar a identidade da escola na nuvem 
 */
async function tentarDescobrirIdentidade() {
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

            salvarConfiguracaoCompleta(); // Persiste a identidade no disco
        }
    } catch (e) {
        console.error('[Sync] Falha no Handshake de identidade:', e);
    }
}

/**
 * Gari Digital: Limpeza de registros sincronizados com mais de 30 dias.
 * Mantém o banco local leve.
 */
async function realizarLimpezaGariDigital() {
    try {
        console.log('[Gari Digital] Iniciando varredura de manutenção...');
        // Deleta apenas o que JÁ FOI sincronizado e tem mais de 30 dias
        await runSql(`
            DELETE FROM registros_acesso 
            WHERE sincronizado = 1 
            AND timestamp_acesso < datetime('now', '-30 days')
        `);
        console.log('[Gari Digital] Limpeza concluída ✔');
    } catch (e: any) {
        console.error('[Gari Digital] Erro na limpeza:', e.message);
    }
}

/**
 * Envia as presenças coletadas localmente para o sistema web (Cloudflare)
 */
export async function sincronizarRegistrosPendentes(): Promise<boolean> {
  if (estaSincronizandoBatidas) return true;
  
  try {
    // 1. Sincroniza Batidas de Alunos
    const pendentes = await allSql(`SELECT * FROM registros_acesso WHERE sincronizado = 0 LIMIT 50`);
    if (pendentes.length > 0) {
        estaSincronizandoBatidas = true;
        const ok = await WorkerApi.enviarBatida(pendentes);
        if (ok) {
            for (const p of pendentes) await runSql('UPDATE registros_acesso SET sincronizado = 1 WHERE id = ?', [p.id]);
            estaSincronizandoBatidas = false;
        } else {
            estaSincronizandoBatidas = false;
            return false;
        }
    }



    return true; 
  } catch (e) {
      console.error('[Sync] Erro crítico na sincronização:', e);
      estaSincronizandoBatidas = false;
      return false;
  }
}

let ultimaConfigHash = '';
let ultimaEtag = '';

/**
 * Pega o total de batidas que ainda não foram enviadas para a nuvem.
 */
export async function obterContagemPendentes(): Promise<number> {
    try {
        const row = await getSql(`SELECT COUNT(*) as total FROM registros_acesso WHERE sincronizado = 0`);
        return row?.total || 0;
    } catch { return 0; }
}

export async function sincronizarCacheAlunos(forcar = false) {
  if (estaSincronizando) return;
  
  if (forcar) {
      console.log(`[Sync] 🚀 FORÇANDO ATUALIZAÇÃO TOTAL (Ignorando Cache de Hash)...`);
      ultimaConfigHash = ''; 
      ultimaEtag = '';
  }
  if (motoresIniciados && forcar && config.escola_id === 'aguardando-identidade') {
      console.log(`[Sync] 🚀 IDENTIDADE EM STANDBY: Tentando handshake forçado agora...`);
      await tentarDescobrirIdentidade();
  }
  
  // 🛡️ PROTEÇÃO: Não tenta baixar nada se não souber quem é (ID Padrão)
  if (!config.escola_id || config.escola_id === 'aguardando-identidade') {
    return;
  }
 
  estaSincronizando = true;
  
  try {
    const resposta = await WorkerApi.buscarSincronizacaoAlunos(ultimaEtag, forcar ? undefined : config.ultimo_sinc_alunos);
    if (!resposta || !resposta.ok) return;

    // Inteligência: Se a rede disse que não mudou nada, não gasta CPU
    if (resposta.mudou === false) {
        estaSincronizando = false;
        return;
    }

    const { alunos: alunosServidor, escola_config, etag } = resposta;
    if (etag) ultimaEtag = etag;

    // Atualiza Configurações Globais (Nome, TTS, Janelas, etc)
    if (escola_config) {
        const configHash = JSON.stringify(escola_config);
        
        if (forcar) {
            console.log("--------------------------------------------------");
            console.log("[Sync] 🌐 PACOTE DE DADOS RECEBIDO DA NUVEM (MANUAL):");
            console.log(` -> Escola: ${escola_config.nome_escola}`);
            console.log(` -> Alunos na Nuvem: ${alunosServidor?.length || 0}`);
            console.log(` -> Janelas de Horário: ${escola_config.janelas?.length || 0} regras ativas.`);
            console.log(` -> Voz (TTS): ${Number(escola_config.tts_ativado) === 1 ? 'LIGADO' : 'DESLIGADO'}`);
            console.log("--------------------------------------------------");
        }

        if (configHash !== ultimaConfigHash) {
            if (!forcar) {
                console.log(`[Sync] 🔗 ATUALIZAÇÃO AUTOMÁTICA: Novas configurações de horários/regras detectadas.`);
            }

            config.nome_escola = escola_config.nome_escola;
            config.tts_ativado = Number(escola_config.tts_ativado) === 1;
            config.tts_sucesso = escola_config.config_tts_frase_sucesso;
            config.tts_erro = escola_config.config_tts_frase_erro;
            config.janelas = escola_config.janelas || [];
            
            ultimaConfigHash = configHash;
            salvarConfiguracaoCompleta(); // Salva novas regras/janelas

            const { avisarMudancaConfig } = require('../main/main');
            avisarMudancaConfig();
        }
    }

    // Sincronização de Turmas (Cache de Turnos)
    const turmasServidor = (resposta as any).turmas;
    if (turmasServidor && Array.isArray(turmasServidor)) {
        for (const t of turmasServidor) {
            await runSql(`
                INSERT INTO turmas_cache (id, turno) VALUES (?, ?)
                ON CONFLICT(id) DO UPDATE SET turno = excluded.turno, atualizado_em = datetime('now', 'localtime')
            `, [t.id, t.turno]);
        }
    }

    // Sincronização de Alunos
    if (alunosServidor) {
        const totalRecebidos = alunosServidor.length;
        if (totalRecebidos > 0) {
            // Log apenas se for a primeira vez no boot ou se realmente houver carga útil
            if (forcar || totalRecebidos > 1 || !config.ultimo_sinc_alunos) {
                console.log(`[Sync] 📥 DELTA SYNC: Recebidos ${totalRecebidos} registros da nuvem.`);
            }
            
            for (const a of (alunosServidor as any[])) {
                const eInativo = Number(a.ativo) === 0 || a.ativo === false;
                
                if (eInativo) {
                    // 🛡️ LGPD: Se o aluno foi desativado/removido na nuvem, limpamos o cache local
                    await runSql(`DELETE FROM alunos_cache WHERE matricula = ? AND escola_id = ?`, [a.matricula, config.escola_id]);
                } else {
                    await runSql(`
                        INSERT INTO alunos_cache (matricula, escola_id, nome_completo, turma_id, turno, mensagem_aviso, ativo)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(matricula, escola_id) DO UPDATE SET
                            nome_completo = excluded.nome_completo,
                            turma_id = excluded.turma_id,
                            turno = excluded.turno,
                            mensagem_aviso = excluded.mensagem_aviso,
                            ativo = excluded.ativo,
                            atualizado_em = datetime('now', 'localtime')
                    `, [a.matricula, config.escola_id, a.nome_completo, a.turma_id, a.turno, a.mensagem_aviso, 1]);
                }
            }

            // Atualiza o timestamp para a próxima sincronização delta
            config.ultimo_sinc_alunos = new Date().toISOString();
            salvarConfiguracaoCompleta(); // ⚡ CRÍTICO: Registra o progresso do Delta Sync
            
            // Sincroniza apenas os alunos que mudaram para os hardwares
            await sincronizarHardwareDelta(alunosServidor);
            
            // Recalcula total de alunos para a UI
            const countRow = await getSql('SELECT COUNT(*) as total FROM alunos_cache');
            config.total_alunos = countRow?.total || 0;
        }
    }

  } catch (e: any) {
    if (forcar) console.error(`[Sync] ✗ ERRO NA ATUALIZAÇÃO FORÇADA:`, e.message);
    WorkerApi.reportarErroCritico(`Erro de Sincronização: ${e.message}`, 'SYNC');
  } finally {
      estaSincronizando = false;
  }
}

/**
 * Wrapper para ser chamado por eventos externos (API/IPC)
 */
export async function forcarSincronizacaoImediata() {
    return await sincronizarCacheAlunos(true);
}

/**
 * Sincronização Delta para o Hardware: Apenas envia/remove o que mudou agora.
 * Muito mais leve que uma convergência total em horários de pico.
 */
async function sincronizarHardwareDelta(alunosAlterados: any[]) {
    const leitores = obterLeitoresAtivos();
    if (!leitores || leitores.length === 0) return;

    for (const leitor of leitores) {
        try {
            if (!(leitor as any).online) continue;
            
            let cadastros = 0;
            let remocoes = 0;

            for (const aluno of alunosAlterados) {
                const deveEstarNoHardware = Number(aluno.ativo) === 1 || aluno.ativo === true;

                if (deveEstarNoHardware) {
                    const res = await leitor.cadastrarAluno({
                        matricula: aluno.matricula,
                        nomeCompleto: aluno.nome_completo
                    });
                    if (res.ok) cadastros++;
                } else {
                    const res = await (leitor as any).removerAluno(String(aluno.matricula));
                    if (res) remocoes++;
                }
            }

            if (cadastros > 0 || remocoes > 0) {
                console.log(`🔄 SYNC[${leitor.nome}] Atualização Delta: +${cadastros} | -${remocoes}`);
            }
        } catch (e: any) {
            console.error(`[Sync] Falha na atualização delta de ${leitor.id}: ${e.message}`);
        }
    }
}
