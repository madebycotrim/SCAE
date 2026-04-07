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
  
  const statusBoot = leitoresAtivos.map(l => ({
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

  // Ciclo de Sincronização com Backoff Exponencial (Proteção de Rede)
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

    // Calcula o próximo delay (Base: 10s | Max: 5min)
    const delayBase = 10 * 1000;
    const multiplicador = Math.min(Math.pow(2, falhasConsecutivas), 30); // Max 300s (5min)
    const proximoDelay = (falhasConsecutivas === 0) ? delayBase : delayBase * multiplicador;

    setTimeout(loopSincronizacao, proximoDelay);
  };
  setTimeout(loopSincronizacao, 10000);

  // Ciclo de 24h para o Gari Digital
  setInterval(() => {
    realizarLimpezaGariDigital();
  }, 24 * 60 * 60 * 1000);

  // Ciclo 5s: Busca comandos remotos críticos (Abrir catraca, Reboot, Sync)
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
                const { processarComandosNuvem } = require('./command-executor');
                await processarComandosNuvem(comandos);
            }
        } catch {}
    }
  }, 5000);

  // Atualização de Status Online (Dashboard de Saúde)
  setInterval(() => {
    if (config.escola_id !== 'aguardando-identidade') {
        const ipLocal = config.ip_agente || require('../utils/rede').buscarIpLocal();
        const statusLimpo = {
            agente_online: true,
            ultimo_visto: new Date().toISOString(),
            ip_interno: ipLocal,
            uptime_seconds: Math.floor(process.uptime()),
            hardware: leitoresAtivos.map(l => ({
                id: l.id,
                nome: l.nome,
                ip: l.ip,
                online: (l as any).online || false,
                total_usuarios: (l as any).totalUsuarios || 0
            }))
        };
        WorkerApi.enviarStatus(statusLimpo);
    }
  }, 30 * 1000);
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
async function sincronizarRegistrosPendentes(): Promise<boolean> {
  if (estaSincronizandoBatidas) return true; // Se a última ainda não terminou, aborta essa tentativa silenciosamente
  
  try {
    const pendentes = await allSql(`SELECT * FROM registros_acesso WHERE sincronizado = 0 LIMIT 50`);
    
    if (pendentes.length > 0) {
        estaSincronizandoBatidas = true;
        
        // Tenta enviar para a Nuvem através do WorkerApi
        const ok = await WorkerApi.enviarBatida(pendentes);
        
        if (ok) {
        for (const p of pendentes) {
            await runSql('UPDATE registros_acesso SET sincronizado = 1 WHERE id = ?', [p.id]);
        }
        console.log(`[Sync] ✓ ENVIADOS: ${pendentes.length} registros de acesso para o sistema web.`);
        estaSincronizandoBatidas = false;
        return true;
        } else {
        console.warn(`[Sync] ! FALHA: Erro ao enviar ${pendentes.length} batidas para a rede.`);
        estaSincronizandoBatidas = false;
        return false;
        }
    }
    return true; // Nada pendente é um "sucesso"
  } catch (e) {
      console.error('[Sync] Erro crítico na sincronização:', e);
      estaSincronizandoBatidas = false;
      return false;
  }
}

let ultimaConfigHash = '';
let ultimaEtag = '';

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
    const resposta = await WorkerApi.buscarSincronizacaoAlunos(ultimaEtag);
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
        if (forcar || alunosServidor.length !== config.total_alunos) {
            console.log(`[Sync] 📥 ATUALIZANDO CACHE: Sincronizando ${alunosServidor.length} alunos com o banco local.`);
            
            for (const a of (alunosServidor as any[])) {
                await runSql(`
                    INSERT INTO alunos_cache (matricula, escola_id, nome_completo, turma_id, turno, ativo)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(matricula, escola_id) DO UPDATE SET
                        nome_completo = excluded.nome_completo,
                        turma_id = excluded.turma_id,
                        turno = excluded.turno,
                        ativo = excluded.ativo,
                        atualizado_em = datetime('now', 'localtime')
                `, [a.matricula, config.escola_id, a.nome_completo, a.turma_id, a.turno, a.ativo === 1 ? 1 : 0]);
            }

            config.total_alunos = alunosServidor.length;
            await sincronizarHardware(alunosServidor);
        } else if (forcar) {
            await sincronizarHardware(alunosServidor);
        }
    }

  } catch (e: any) {
    if (forcar) console.error(`[Sync] ✗ ERRO NA ATUALIZAÇÃO FORÇADA:`, e.message);
    WorkerApi.reportarErroCritico(`Erro de Sincronização: ${e.message}`, 'SYNC');
  } finally {
      estaSincronizando = false;
  }
}

async function sincronizarHardware(alunosNuvem: any[]) {
    if (!leitoresAtivos || leitoresAtivos.length === 0) return;

    for (const leitor of leitoresAtivos) {
        try {
            if (!(leitor as any).online) continue;
            if (!leitor.listarAlunos) continue;

            const usuariosHardware = await leitor.listarAlunos();
            const matriculasNoHardware = new Set(usuariosHardware.map((u: any) => String(u.registration || "").trim()));

            let cadastrosRealizados = 0;
            let exclusoesRealizadas = 0;

            for (const aluno of alunosNuvem) {
                const matriculaLimpa = String(aluno.matricula).trim();
                const deveEstarNoHardware = Number(aluno.ativo) === 1 || aluno.ativo === true;

                if (deveEstarNoHardware && !matriculasNoHardware.has(matriculaLimpa)) {
                    const res = await leitor.cadastrarAluno({
                        matricula: aluno.matricula,
                        nomeCompleto: aluno.nome_completo
                    });
                    if (res.ok) cadastrosRealizados++;
                }
            }

            const matriculasAtivasNuvem = new Set(
                alunosNuvem
                    .filter(a => Number(a.ativo) === 1 || a.ativo === true)
                    .map(a => String(a.matricula).trim())
            );
            for (const hardwareUser of usuariosHardware) {
                const reg = String(hardwareUser.registration || "").trim();
                if (reg && reg !== "0" && !matriculasAtivasNuvem.has(reg)) {
                    await (leitor as any).removerAluno(reg);
                    exclusoesRealizadas++;
                }
            }

            if (cadastrosRealizados > 0 || exclusoesRealizadas > 0) {
                console.warn(`[Sync] 🛡️ CONVERGÊNCIA CONCLUÍDA [${leitor.nome}]: +${cadastrosRealizados} inseridos | -${exclusoesRealizadas} removidos.`);
            }
        } catch (e: any) {
            console.error(`[Sync] 🛡️ Falha na convergência de ${leitor.id}: ${e.message}`);
        }
    }
}
