import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as http from 'http';
import { leitoresAtivos, iniciarPolling, recarregarLeitores } from '../services/poller';
import { IdflexLeitor } from '../drivers/IdflexLeitor';
import { iniciarSync } from '../services/sync';
import { runSql, getSql } from '../infra/db';
import { config } from '../infra/config';
import { stats } from '../infra/stats';
import { NotificadorVoz } from '../services/notificador-voz';
import { buscarIpLocal } from '../utils/rede';

let mainWindow: BrowserWindow | null = null;
let notificador: NotificadorVoz | null = null;

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
        res.writeHead(200); res.end(JSON.stringify({ ok: true, versao: '1.2.0' }));
    } else if (req.url === '/sync-now' && req.method === 'POST') {
        // --- GATILHO DE SINCRONIZAÇÃO INSTANTÂNEA ---
        try {
            console.log('[Agente] Sincronização em tempo real solicitada pelo Dashboard!');
            const { sincronizarCacheAlunos } = require('../services/sync');
            await sincronizarCacheAlunos();
            res.writeHead(200); res.end(JSON.stringify({ ok: true }));
        } catch (e) {
            res.writeHead(500); res.end(JSON.stringify({ error: 'Erro no trigger de sync' }));
        }
    } else if (req.url?.startsWith('/idflex-push') && req.method === 'POST') {
        // --- ENDPOINT DE PUSH (REAL-TIME) DO IDFLEX ---
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
             try {
                const ev = JSON.parse(body);
                const clientIp = req.socket.remoteAddress?.replace('::ffff:', '');
                const leitor = leitoresAtivos.find(l => l.ip === clientIp) as any;

                if (leitor && ev.event !== undefined) {
                    const idUsuario = ev.user_id || 0;
                    const statusAcesso = [6, 7, 10, 11, 12, 14, 15, 16, 31].includes(ev.event) ? 'ENTRADA' : 'NEGADO';
                    
                    console.log(`[Push] Evento ${ev.event} (Status: ${statusAcesso}) no Leitor ${leitor.id}`);

                    let nomeParaExibir = 'ACESSO NÃO RECONHECIDO';
                    let matriculaParaExibir = '—';

                    if (idUsuario !== 0 && idUsuario !== '0') {
                        const info = leitor.obterDadosUsuarioHardware(String(idUsuario));
                        nomeParaExibir = info.nome;
                        matriculaParaExibir = info.matricula;
                    }

                    if (statusAcesso === 'ENTRADA') {
                        leitor.emitirBeep();
                        if (notificador) notificador.anunciarAcesso(nomeParaExibir, 'ENTRADA');
                    } else {
                        if (leitor.emitirBeepErro) leitor.emitirBeepErro();
                        else leitor.emitirBeep();
                        if (notificador) notificador.anunciarAcesso(nomeParaExibir, 'NEGADO');
                    }

                    if (mainWindow) {
                        mainWindow.webContents.send('new-access', { 
                            nome: (idUsuario === 0) ? nomeParaExibir : `${nomeParaExibir} (${matriculaParaExibir})`, 
                            sucesso: statusAcesso === 'ENTRADA' 
                        });
                    }

                    stats.registrarAcesso(nomeParaExibir, matriculaParaExibir, statusAcesso);
                }
             } catch (e) { console.error('[Push] Erro:', e); }
             res.writeHead(200); res.end();
        });
    }
  });

  server.listen(1912, '0.0.0.0', () => {
      console.log(`[Local API] Servidor ativo em http://0.0.0.0:1912`);
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  ipcMain.handle('cadastrar-aluno', async (_event, { leitorId, alunoId }) => {
    const leitor = leitoresAtivos.find(l => l.id === leitorId);
    if (leitor && (leitor as any).iniciarCaptura) {
        return await (leitor as any).iniciarCaptura(parseInt(alunoId, 10));
    }
    return false;
  });

  ipcMain.handle('listar-alunos', async (_event, { leitorId }) => {
    const leitor = leitoresAtivos.find(l => l.id === leitorId);
    if (leitor && (leitor as any).listarAlunos) return await (leitor as any).listarAlunos();
    return [];
  });
}

app.whenReady().then(async () => {
  await createWindow();
  notificador = new NotificadorVoz(mainWindow);

  try {
    iniciarPolling(notificador);
    iniciarSync();
  } catch (e) {
    console.warn('[Agent] Erro na inicialização:', e);
  }

  // Monitor de Logs para UI
  const repassarAoLogVisual = (msg: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('new-log', msg);
  };
  const originalLog = console.log;
  console.log = (...args) => {
      originalLog(...args);
      repassarAoLogVisual(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
  };
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
