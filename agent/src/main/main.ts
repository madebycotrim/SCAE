import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as http from 'http';

// Importações Dinâmicas (Para Eventos)
import { leitoresAtivos, iniciarPolling, recarregarLeitores } from '../services/poller';
import { iniciarSync, sincronizarCacheAlunos } from '../services/sync';
import { runSql, getSql } from '../infra/db';
import { config, salvarLeitoresNoDisco, carregarConfiguracaoHardware } from '../infra/config';
import { stats } from '../infra/stats';
import dns from 'dns';

import { buscarIpLocal } from '../utils/rede';

let mainWindow: BrowserWindow | null = null;
let sistemaAtivado = false;

// Garante carregamento de IP no Radar
carregarConfiguracaoHardware();

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: 'SCAE - Agente de Biometria',
    icon: path.join(__dirname, '..', '..', 'public', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
  });

  // --- SERVIDOR LOCAL PARA RECEBER PUSH DOS HARDWARES ---
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.url === '/ping') {
        const statsObj = {
            ok: true,
            agente: 'Catraki Edge Agent',
            versao: '1.6.2-FINAL', // Versão atualizada
            escola: config.nome_escola || config.escola_id, 
            status: sistemaAtivado ? 'ONLINE (TÚNEL ATIVO)' : 'STANDBY (SINAL RESTRITO)',
            stats: stats.obterSnapshot(),
            config: {
                tts: config.tts_ativado,
                frase_sucesso: config.tts_sucesso
            },
            leitores: leitoresAtivos.map(l => ({
                id: l.id,
                nome: l.nome,
                tipo: 'ID_FLEX',
                online: (l as any).online || false,
                ip: l.ip,
                porta: l.porta
            }))
        };
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(statsObj));
    } else if (req.url === '/sync-now' && req.method === 'POST') {
        try {
            await sincronizarCacheAlunos();
            res.writeHead(200); res.end(JSON.stringify({ ok: true }));
        } catch (e) {
            res.writeHead(500); res.end(JSON.stringify({ error: 'Erro no trigger de sync' }));
        }
    } else if (req.url === '/enroll' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
             try {
                const { aluno_id, leitor_id } = JSON.parse(body);
                const leitor = leitor_id 
                    ? leitoresAtivos.find(l => l.id === leitor_id)
                    : leitoresAtivos[0];

                if (leitor && (leitor as any).iniciarCaptura) {
                    console.log(`[Enroll] Captura para aluno ${aluno_id} no leitor ${leitor.id}`);
                    const ok = await (leitor as any).iniciarCaptura(parseInt(aluno_id, 10));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok, mensagem: ok ? 'Captura iniciada' : 'Erro' }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, mensagem: 'Hardware não disponível' }));
                }
             } catch (e) {
                res.writeHead(500); res.end(JSON.stringify({ ok: false, erro: 'Invalid Body' }));
             }
        });
    } else if (req.url?.startsWith('/idflex-push') && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
             try {
                const ev = JSON.parse(body);
                const clientIp = req.socket.remoteAddress?.replace('::ffff:', '').split(':')[0];
                
                const leitor = leitoresAtivos.find(l => {
                    const leitorBaseIp = l.ip.split(':')[0];
                    return leitorBaseIp === clientIp;
                }) as any;

                if (leitor && ev.event !== undefined) {
                    const idUsuario = ev.user_id || 0;
                    const statusAcesso = [6, 7, 10, 11, 12, 14, 15, 16, 31].includes(ev.event) ? 'ENTRADA' : 'NEGADO';
                    let nomeParaExibir = 'ACESSO NÃO RECONHECIDO';
                    let matriculaParaExibir = '—';

                    if (idUsuario !== 0 && idUsuario !== '0') {
                        const info = leitor.obterDadosUsuarioHardware(String(idUsuario));
                        nomeParaExibir = info.nome;
                        matriculaParaExibir = info.matricula;
                    }

                    if (statusAcesso === 'ENTRADA') leitor.emitirBeep();
                    else (leitor.emitirBeepErro ? leitor.emitirBeepErro() : leitor.emitirBeep());

                    if (mainWindow) {
                        mainWindow.webContents.send('new-access', { 
                            nome: (idUsuario === 0) ? nomeParaExibir : `${nomeParaExibir} (${matriculaParaExibir})`, 
                            nomePuro: nomeParaExibir,
                            sucesso: statusAcesso === 'ENTRADA',
                            ttsAtivo: config.tts_ativado,
                            ttsParams: {
                                sucesso: config.tts_sucesso || 'Bem-vindo, {nome}!',
                                erro: config.tts_erro || 'Acesso negado, {nome}!'
                            }
                        });
                    }
                    stats.registrarAcesso(nomeParaExibir, matriculaParaExibir, statusAcesso);
                }
             } catch (e) { console.error('[Push] Erro:', e); }
             res.writeHead(200); res.end();
        });
    } else if (req.url === '/reset-db' && req.method === 'POST') {
        // --- 💣 RESET SEGURO ---
        try {
            const { resetarBancoLocal } = require('../infra/db');
            resetarBancoLocal().then(() => {
                setTimeout(() => { app.relaunch(); app.exit(0); }, 500);
            });
            res.writeHead(200); res.end(JSON.stringify({ ok: true }));
        } catch (e) { res.writeHead(500); res.end(JSON.stringify({ ok: false })); }
    }
  });

  server.listen(1912, '0.0.0.0', () => {
      console.log(`[Local API] Servidor ativo em http://0.0.0.0:1912`);
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  ipcMain.handle('salvar-leitores', async (_event, { leitores }) => {
    try {
        console.warn(`[Agente] Salvando ${leitores.length} leitores no disco...`);
        const ok = salvarLeitoresNoDisco(leitores);
        if (ok) {
            // ESSENCIAL: Recarregar a config do disco ANTES de inicializar os leitores no poller
            carregarConfiguracaoHardware();
            await recarregarLeitores(); // Agora o recarregar verá a config atualizada no disco
            return { ok: true };
        }
        return { ok: false, erro: 'Falha durante escrita de arquivo' };
    } catch (e: any) {
        console.error('[Agente] Falha ao salvar hardware:', e.message);
        return { ok: false, erro: e.message };
    }
  });

  ipcMain.handle('listar-alunos', async (_event, { leitorId }) => {
    const leitor = leitoresAtivos.find(l => l.id === leitorId);
    if (leitor && (leitor as any).listarAlunos) return await (leitor as any).listarAlunos();
    return [];
  });
}

app.whenReady().then(async () => {
    console.log('[Agente] Aplicação Electron pronta!');
    await createWindow();
    
    /**
     * Ciclo de Ativação Inteligente: Só liga o Sync e o Polling Real
     * se houver pelo menos um equipamento respondendo.
     */
    const tentarAtivacaoSistemas = async () => {
      if (sistemaAtivado) return;

      const temAlguemOnline = leitoresAtivos.some(l => (l as any).online === true);
      
      if (temAlguemOnline) {
        console.log('[Agente] 🟢 HARDWARE ONLINE! Ativando motores do sistema...');
        sistemaAtivado = true;
        
        iniciarPolling(mainWindow);
        await iniciarSync();

        console.log('[Agente] Sistema totalmente operacional ✓');
      } else {
        console.log('[Agente] ⏳ Standby: Aguardando sinal de vida dos equipamentos...');
      }
    };
  
    try {
      enviarStatusHardware();
      setInterval(tentarAtivacaoSistemas, 5000);
      setTimeout(tentarAtivacaoSistemas, 1500);
  
    } catch (e: any) {
      console.error('[Agent] Erro na inicialização:', e.message);
    }

  // Logs Visuais
  const originalLog = console.log;
  console.log = (...args) => {
      originalLog(...args);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('new-log', args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
      }
  };
});

function enviarStatusHardware() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('hardware-status', {
    nome_escola: config.nome_escola,
    total_alunos: config.total_alunos || 0,
    tts_ativado: config.tts_ativado,
    leitores: leitoresAtivos.map(l => ({
      id: l.id, nome: l.nome, ip: l.ip, porta: l.porta,
      online: (l as any).online || false, 
      totalUsuarios: (l as any).totalUsuarios || 0
    }))
  });
}

setInterval(enviarStatusHardware, 10000);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
// --- API PARA O SERVIÇO DE SYNC ---
export function avisarMudancaConfig() {
    if (!mainWindow) return;
    
    mainWindow.webContents.send('hardware-status', {
        ok: true,
        nome_escola: config.nome_escola,
        total_alunos: config.total_alunos,
        tts_ativado: config.tts_ativado,
        leitores: leitoresAtivos.map(l => ({
            id: l.id,
            nome: l.nome,
            online: (l as any).online || false,
            ip: l.ip
        }))
    });
}
