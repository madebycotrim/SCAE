/**
 * services/command-executor.ts
 * Executor de Ordens vindas da Nuvem.
 */

import { runSql } from '../infra/db';
import { stats } from '../infra/stats';

import { config } from '../infra/config';
import { sincronizarCacheAlunos } from './sync';
import { obterLeitoresAtivos } from './poller';
import { app } from 'electron';
import { WorkerApi } from './worker-endpoint';

export async function processarComandosNuvem(comandos: any[]) {
    if (!comandos || comandos.length === 0) return;

    console.log(`[Comandos] 📥 Recebidos ${comandos.length} ordens da nuvem.`);

    for (const cmd of comandos) {
        try {
            console.log(`[Comandos] ⚡ Executando: ${cmd.acao}...`);
            
            let sucesso = false;

            switch (cmd.acao) {
                case 'FORCE_SYNC':
                    await sincronizarCacheAlunos(true);
                    sucesso = true;
                    break;

                case 'REBOOT_AGENT':
                    console.warn('[Comandos] 🔄 REINICIANDO AGENTE POR ORDEM REMOTA...');
                    setTimeout(() => { app.relaunch(); app.exit(0); }, 2000);
                    sucesso = true;
                    break;

                case 'REBOOT_HARDWARE':
                    console.warn('[Comandos] 📡 REINICIANDO HARDWARE FÍSICO POR ORDEM REMOTA...');
                    const { rebootFisicoGeral, recarregarLeitores } = require('./poller');
                    rebootFisicoGeral();
                    recarregarLeitores();
                    sucesso = true;
                    break;

                case 'SET_HARDWARE_BANNER':
                    const b64 = cmd.params?.base64;
                    // Note: b64 pode ser string vazia para resetar para o padrão
                    if (b64 === undefined || b64 === null) {
                        console.warn('[Comandos] ⚠ Banner inválido (parâmetro base64 ausente).');
                        break;
                    }
                    
                    console.log(`[Comandos] 🎨 ${b64 === '' ? 'Resetando' : 'Aplicando novo'} banner de standby nos leitores...`);
                    const leitoresB = obterLeitoresAtivos();
                    for (const l of leitoresB) {
                        if ((l as any).setLogo) {
                            await (l as any).setLogo(b64);
                        }
                    }
                    sucesso = true;
                    break;

                case 'SET_DISPLAY_MESSAGE':
                    const msg = cmd.params?.mensagem || 'BEM-VINDO!';
                    const time = cmd.params?.timeout || 5000;
                    console.log(`[Comandos] 💬 Exibindo mensagem nos leitores: "${msg}"`);
                    const leitoresMsg = obterLeitoresAtivos();
                    for (const l of leitoresMsg) {
                        l.exibirMensagemHardware?.(msg, time);
                    }
                    sucesso = true;
                    break;

                case 'CLEAN_HARDWARE':
                    console.warn('[Comandos] 🧹 INICIANDO FAXINA DE HARDWARE (ZUMBI CLEANER)...');
                    const { getSql } = require('../infra/db');
                    const leitoresF = obterLeitoresAtivos();
                    for (const l of leitoresF) {
                        if (l.listarAlunos) {
                            const alunosHardware = await l.listarAlunos();
                            console.log(`[Cleaner] ${l.nome}: Verificando ${alunosHardware.length} usuários...`);
                            for (const ah of alunosHardware) {
                                // O registration no iDFlex é o link com a nossa matrícula
                                const existe = await getSql('SELECT 1 FROM alunos_cache WHERE matricula = ?', [ah.registration]);
                                if (!existe && ah.registration) {
                                    console.log(`[Cleaner] 🚫 Removendo zumbi: ${ah.name} (Matrícula: ${ah.registration})`);
                                    await l.removerAluno(ah.registration);
                                }
                            }
                        }
                    }
                    sucesso = true;
                    break;

                case 'ABRIR_CATRACA':
                    const leitorId = cmd.params?.leitorId;
                    const leitores = obterLeitoresAtivos();
                    const leitor = leitorId 
                        ? leitores.find(l => l.id === leitorId) 
                        : leitores[0]; // Se não especificar, pega o primeiro
                    
                    if (leitor) {
                        console.log(`[Comandos] 🔓 Abrindo catraca: ${leitor.nome}`);
                        await leitor.abrirPorta();
                        await leitor.exibirMensagemHardware?.('ACESSO REMOTO', 3000);
                        sucesso = true;
                    }
                    break;
                
                case 'UPDATE_CONFIG':
                    // Recarrega configs da nuvem (Nome da escola, TTS, etc)
                    await sincronizarCacheAlunos(true);
                    sucesso = true;
                    break;

                case 'WIPE_LOGS':
                    console.warn('[Comandos] 🧹 LIMPANDO LOGS LOCAIS POR ORDEM REMOTA...');
                    await runSql('DELETE FROM registros_acesso');
                    stats.limparEstatisticas();
                    sucesso = true;
                    break;

                default:
                    console.warn(`[Comandos] ❓ Ação desconhecida: ${cmd.acao}`);
            }

            if (sucesso) {
                // Notifica a nuvem que o comando foi executado para remover da fila
                await fetch(`${config.endpoint_worker}/api/agente/comandos?id=${cmd.id}`, {
                    method: 'DELETE',
                    headers: { 
                        'X-Escola-ID': config.escola_id,
                        'X-Agente-Token': config.agente_secret 
                    }
                });
            }
        } catch (e: any) {
            console.error(`[Comandos] ✗ Erro ao executar ${cmd.acao}:`, e.message);
        }
    }
}
