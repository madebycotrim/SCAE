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

  // Atualização de Status Online (Dashboard)
  setInterval(() => {
    if (config.escola_id !== 'aguardando-identidade') {
        const statusLimpo = leitoresAtivos.map(l => ({
            id: l.id,
            nome: l.nome,
            online: (l as any).online || false
        }));
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

    // Atualiza Configurações Globais (Nome, TTS, etc)
    if (escola_config) {
        const configHash = JSON.stringify(escola_config);
        
        // Log Detalhado APENAS se for disparado MANUALMENTE pelo Site
        if (forcar) {
            console.log("--------------------------------------------------");
            console.log("[Sync] 🌐 PACOTE DE DADOS RECEBIDO DA NUVEM (MANUAL):");
            console.log(` -> Escola: ${escola_config.nome_escola}`);
            console.log(` -> Alunos na Nuvem: ${alunosServidor?.length || 0}`);
            console.log(` -> Voz (TTS): ${Number(escola_config.tts_ativado) === 1 ? 'LIGADO' : 'DESLIGADO'}`);
            console.log(` -> Msg Sucesso (Web): "${escola_config.config_tts_frase_sucesso ?? ''}"`);
            console.log(` -> Msg Erro (Web): "${escola_config.config_tts_frase_erro ?? ''}"`);
            console.log("--------------------------------------------------");
        }

        // Execução do Sync de Config se o Hash mudou (Background Silencioso se forcar=false)
        if (configHash !== ultimaConfigHash) {
            // Sincronização de Atributos com o Global Config (Verdade Absoluta da Nuvem)
            const ttsAntes = config.tts_ativado;
            const sucessoAntes = config.tts_sucesso;
            const erroAntes = config.tts_erro;

            if (!forcar) {
                console.log(`[Sync] 🔗 ATUALIZAÇÃO AUTOMÁTICA: Novas configurações detectadas via nuvem.`);
            }

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

        // --- CONVERGÊNCIA DE HARDWARE (MANTÉM O DISPOSITIVO FÍSICO ESPELHADO) ---
        // Roda sempre que há mudança no cache ou quando o usuário força via Dashboard
        await sincronizarHardware(alunosServidor);
    } else if (forcar && alunosServidor) {
        // Se o usuário clicou em "Atualizar Status" mas o ETag não mudou (304), 
        // forçamos a convergência de hardware mesmo assim para garantir 100% de integridade física.
        await sincronizarHardware(alunosServidor);
    }

  } catch (e: any) {
    if (forcar) console.error(`[Sync] ✗ ERRO NA ATUALIZAÇÃO FORÇADA:`, e.message);
    // Telemetria (Item 4)
    WorkerApi.reportarErroCritico(`Erro de Sincronização: ${e.message}`, 'SYNC');
  } finally {
      estaSincronizando = false;
  }
}

/**
 * Motor de Integridade Física: Garante que os alunos da Nuvem existam no Hardware iDFlex.
 * Resolve discrepâncias entre o Banco Online e a memória interna do equipamento.
 */
async function sincronizarHardware(alunosNuvem: any[]) {
    if (!leitoresAtivos || leitoresAtivos.length === 0) {
        console.warn(`[Sync][Hardware] Abortando: Nenhum leitor ativo no radar.`);
        return;
    }

    console.log(`[Sync][Hardware] Iniciando análise de ${alunosNuvem.length} alunos da nuvem...`);

    for (const leitor of leitoresAtivos) {
        try {
            if (!leitor.listarAlunos) {
                console.log(`[Sync][Hardware] Leitor ${leitor.nome} não suporta listagem de alunos.`);
                continue;
            }

            // Verifica se o leitor está marcado como online pelo poller
            if (!(leitor as any).online) {
                console.warn(`[Sync][Hardware] Pulando ${leitor.nome}: Equipamento em modo OFFLINE/STANDBY.`);
                continue;
            }

            const usuariosHardware = await leitor.listarAlunos();
            const matriculasNoHardware = new Set(usuariosHardware.map((u: any) => String(u.registration || "").trim()));

            console.log(`[Sync][Hardware] Analisando ${leitor.nome} (${usuariosHardware.length} usuários detectados).`);
            if (usuariosHardware.length > 0 && usuariosHardware.length < 10) {
                 console.log(`[Sync][Hardware] Matrículas no hardware: [${Array.from(matriculasNoHardware).join(', ')}]`);
            }

            let cadastrosRealizados = 0;
            let exclusoesRealizadas = 0;

            // 1. Injetar Alunos que faltam no hardware
            for (const aluno of alunosNuvem) {
                const matriculaLimpa = String(aluno.matricula).trim();
                // D1 retorna 0/1 para booleanos. Garantimos a conversão.
                const deveEstarNoHardware = Number(aluno.ativo) === 1 || aluno.ativo === true;

                if (deveEstarNoHardware && !matriculasNoHardware.has(matriculaLimpa)) {
                    console.log(`[Sync][Hardware] +++ CADASTRANDO: ${aluno.nome_completo} (${matriculaLimpa}) em ${leitor.nome}`);
                    const res = await leitor.cadastrarAluno({
                        matricula: aluno.matricula,
                        nomeCompleto: aluno.nome_completo
                    });
                    if (res.ok) cadastrosRealizados++;
                    else console.error(`[Sync][Hardware] !!! Erro ao cadastrar ${aluno.nome_completo}: ${res.erro}`);
                }
            }

            // 2. Expurgar Alunos inativos ou removidos
            const matriculasAtivasNuvem = new Set(
                alunosNuvem
                    .filter(a => Number(a.ativo) === 1 || a.ativo === true)
                    .map(a => String(a.matricula).trim())
            );
            for (const hardwareUser of usuariosHardware) {
                const reg = String(hardwareUser.registration || "").trim();
                if (reg && reg !== "0" && !matriculasAtivasNuvem.has(reg)) {
                    console.log(`[Sync][Hardware] <- Removendo acesso obsoleto: Reg ${reg} de ${leitor.nome}...`);
                    await (leitor as any).removerAluno(reg);
                    exclusoesRealizadas++;
                }
            }

            if (cadastrosRealizados > 0 || exclusoesRealizadas > 0) {
                console.warn(`[Sync] 🛡️ CONVERGÊNCIA CONCLUÍDA [${leitor.nome}]: +${cadastrosRealizados} inseridos | -${exclusoesRealizadas} removidos.`);
            } else {
                console.log(`[Sync] 🛡️ HARDWARE [${leitor.nome}] JÁ ESTÁ 100% SINCRONIZADO.`);
            }

        } catch (e: any) {
            console.error(`[Sync] 🛡️ Falha na convergência de ${leitor.id}: ${e.message}`);
            if (e.code !== 'ECONNREFUSED' && e.code !== 'ETIMEDOUT') {
                console.error(`[Poller] Falha no leitor ${leitor.id}:`, e.message);
                // Telemetria (Item 4): Reporta se for um erro de software/banco e não apenas rede offline
                const { WorkerApi } = require('./worker-endpoint');
                WorkerApi.reportarErroCritico(`Falha Poller [${leitor.id}]: ${e.message}`, 'HARDWARE');
            }
        }
    }
}
