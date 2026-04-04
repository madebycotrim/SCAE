import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as http from 'http';
import { leitoresAtivos, iniciarPolling, recarregarLeitores } from '../services/poller';
import { IdflexLeitor } from '../drivers/IdflexLeitor';
import { iniciarSync, sincronizarCacheAlunos } from '../services/sync';
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
        const statsObj = {
            ok: true,
            agente: 'SCAE Edge Agent',
            versao: '1.6.0',
            escola: config.escola_id,
            status: 'OPERACIONAL',
            stats: stats.obterSnapshot(),
            leitores: leitoresAtivos.map(l => ({
                id: l.id,
                nome: l.nome,
                tipo: 'ID_FLEX',
                online: (l as any).online || false,
                ip: l.ip,
                porta: l.porta
            }))
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(statsObj));
    } else if (req.url === '/sync-now' && req.method === 'POST') {
        // --- GATILHO DE SINCRONIZAÇÃO INSTANTÂNEA ---
        try {
            console.log('[Agente] Sincronização em tempo real solicitada pelo Dashboard!');
            await sincronizarCacheAlunos();
            
            // 🎙️ Feedback Vocal de Teste (Confirma que o TTS está OK e sincronizado)
            if (notificador) {
                await notificador.falar('Configurações atualizadas!');
            }

            res.writeHead(200); res.end(JSON.stringify({ ok: true }));
        } catch (e) {
            console.error('[Sync Now Error]', e);
            res.writeHead(500); res.end(JSON.stringify({ error: 'Erro no trigger de sync' }));
        }
    } else if (req.url === '/enroll' && req.method === 'POST') {
        // --- GATILHO DE CADASTRO REMOTO VIA DASHBOARD ---
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
             try {
                const { aluno_id, leitor_id } = JSON.parse(body);
                // Busca o leitor ativo (se não informado, pega o primeiro)
                const leitor = leitor_id 
                    ? leitoresAtivos.find(l => l.id === leitor_id)
                    : leitoresAtivos[0];

                if (leitor && (leitor as any).iniciarCaptura) {
                    console.log(`[Enroll] Iniciando captura para aluno ${aluno_id} no leitor ${leitor.id}`);
                    const ok = await (leitor as any).iniciarCaptura(parseInt(aluno_id, 10));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok, mensagem: ok ? 'Captura iniciada' : 'Leitor ocupado ou erro' }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, mensagem: 'Hardware não disponível' }));
                }
             } catch (e) {
                res.writeHead(500); res.end(JSON.stringify({ ok: false, erro: 'Invalid Body' }));
             }
        });
    } else if (req.url?.startsWith('/idflex-push') && req.method === 'POST') {
        // --- 📡 DEBUG DE RECEBIMENTO DE PUSH (REAL-TIME) ---
        console.log(`[Push] Conexão recebida de ${req.socket.remoteAddress}`);
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
             console.log(`[Push] Body recebido: ${body}`);
             try {
                const ev = JSON.parse(body);
                const clientIp = req.socket.remoteAddress?.replace('::ffff:', '').split(':')[0]; // Pega só o IP, sem subporta IPv6
                
                // Busca o leitor cujo IP (contido na string IP:PORTA) bata com o IP do cliente
                const leitor = leitoresAtivos.find(l => {
                    const leitorBaseIp = l.ip.split(':')[0];
                    return leitorBaseIp === clientIp;
                }) as any;

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

  ipcMain.handle('salvar-leitores', async (_event, { leitores }) => {
    try {
        console.log('[Agente] Salvando nova configuração de hardware...');
        const { salvarLeitoresNoDisco } = await import('../infra/config');
        salvarLeitoresNoDisco(leitores);
        
        await recarregarLeitores(); // Reinicia conexões no Poller
        return { ok: true };
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
  
  notificador = new NotificadorVoz(mainWindow);
  console.log('[Agente] Motor de Voz (TTS) inicializado.');
  
  // 🔊 TESTE DE VOZ NO BOOT (Para diagnosticar se o Windows/Electron está OK)
  setTimeout(() => {
    notificador?.falar('Sistema de voz ativo');
  }, 3000);

  try {
    console.log('[Agente] Iniciando Polling dos equipamentos...');
    iniciarPolling(notificador);
    enviarStatusHardware();
    
    console.log('[Agente] Iniciando Sincronizador de Nuvem...');
    iniciarSync();

    console.log('[Agente] Sistema totalmente operacional ✓');
  } catch (e: any) {
    console.error('[Agent] Erro FATAL na inicialização:', e.message);
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

/** Envia o status atual dos leitores para o Renderer (Vite/React) */
function enviarStatusHardware() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const status = {
    leitores: leitoresAtivos.map(l => ({
      id: l.id,
      nome: l.nome,
      ip: l.ip,
      porta: l.porta,
      online: (l as any).online || false, // Esse campo 'online' é gerenciado pelo status() do leitor
      totalUsuarios: (l as any).totalUsuarios || 0
    }))
  };

  mainWindow.webContents.send('hardware-status', status);
}

// Atualização de Status de Hardware (A cada 10 segundos)
setInterval(enviarStatusHardware, 10000);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
