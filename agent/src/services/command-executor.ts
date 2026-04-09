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
