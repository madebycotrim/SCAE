/**
 * main/main.ts
 * Processo Principal do Electron - Agente Local Catraki v1.5
 * Hardware Real <-> Dashboard em Tempo Real
 */

import { app, BrowserWindow, nativeImage, ipcMain } from 'electron';
import path from 'path';
import { iniciarPolling, leitoresAtivos, recarregarLeitores } from '../services/poller';
import { iniciarSync } from '../services/sync';
import { NotificadorVoz } from '../services/notificador-voz';
import { config, salvarLeitoresNoDisco } from '../infra/config';
import { TipoLeitor } from '../drivers/ILeitor';
import { WorkerApi } from '../services/worker-endpoint';
import { stats } from '../infra/stats';
import http from 'http';

// --- Servidor de Descoberta Local ---
// Permite que o Dashboard Web saiba se este agente está rodando nesta máquina.
const LOCAL_SERVER_PORT = 1912; // Porta fixa para descoberta
const iniciarServidorDescoberta = () => {
  const server = http.createServer((req, res) => {
    // Enable CORS para o sistema web
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    if (req.url === '/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      
      // Coletar status dos leitores instantaneamente (Nomes dinâmicos resolvidos pelos drivers)
      const leitores = leitoresAtivos.map(l => {
        const configRaw = (l as any).cfg || {};
        // Limpa o IP garantindo que não venha com porta grudada (ex: 1.1.1.1:8080 -> 1.1.1.1)
        const ipLimpo = String(configRaw.ip || '0.0.0.0').split(':')[0];
        
        return {
          id: l.id,
          nome: l.nome,
          tipo: l.tipo,
          ip: ipLimpo,
          porta: configRaw.porta || 80,
          online: true, 
        };
      });

      res.end(JSON.stringify({ 
        ok: true, 
        agente: 'Catraki Edge Agent', 
        versao: '1.6.0',
        escola: config.escola_id,
        status: 'RUNNING',
        stats: stats.obterSnapshot(),
        leitores
      }));
    } else if (req.url === '/enroll' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { aluno_id } = JSON.parse(body);
                const leitor = leitoresAtivos.find(l => (l as any).iniciarCaptura);
                if (!leitor) throw new Error('Hardware biométrico não encontrado.');
                
                // Enroll no iDFlex via driver
                const ok = await (leitor as any).iniciarCaptura(parseInt(aluno_id, 10));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok }));
            } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, mensagem: e.message }));
            }
        });
    } else if (req.url === '/config/leitor' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { id, ip, porta } = JSON.parse(body);
                // Limpa o IP se o usuário digitou com porta (ex: 192.168.1.34:8080 -> 192.168.1.34)
                const ipNormalizado = String(ip).split(':')[0];

                // Atualiza a config em disco
                const novosLeitores = config.leitores.map((l: any) => {
                    if (l.id === id) return { ...l, ip: ipNormalizado, porta: parseInt(String(porta), 10) };
                    return l;
                });
                
                salvarLeitoresNoDisco(novosLeitores);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, mensagem: 'Configuração atualizada. Reinicie o Agente para aplicar.' }));
            } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, mensagem: e.message }));
            }
        });
    } else if (req.url === '/config/adicionar' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { id, ip, porta } = JSON.parse(body);
                // Verifica se já existe
                if (config.leitores.find((l: any) => l.id === id)) {
                    throw new Error('Já existe um equipamento com esse ID.');
                }

                const novosLeitores = [
                    ...config.leitores,
                    { 
                        id, 
                        nome: id, 
                        tipo: 'ID_FLEX', 
                        ip: String(ip).split(':')[0], 
                        porta: parseInt(String(porta), 10) 
                    }
                ];
                
                salvarLeitoresNoDisco(novosLeitores);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, mensagem: 'Equipamento adicionado com sucesso!' }));
            } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, mensagem: e.message }));
            }
        });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(LOCAL_SERVER_PORT, '0.0.0.0', () => {
    console.log(`[Local API] Servidor de descoberta ativo em http://0.0.0.0:${LOCAL_SERVER_PORT}`);
  });
};





let mainWindow: BrowserWindow | null = null;
let notificador: NotificadorVoz | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 850,
    resizable: true,
    maximizable: true,

    title: 'Catraki Edge Agent Control',
    icon: nativeImage.createEmpty(),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Broadcast de Status Real e Detalhado
  setInterval(async () => {
    if (mainWindow) {
      const statusLeitores = await Promise.all(leitoresAtivos.map(async l => {
        let isOnline = false;
        let pNome = l.nome;

        try {
          isOnline = await l.ping();
          if (isOnline && (l as any).getNomeDispositivo) {
            const n = await (l as any).getNomeDispositivo();
            if (n) pNome = n; // "IDFLEX-CATRAKI" ou etc
          }
        } catch {}

        return {
          id: l.id,
          nome: pNome,
          tipo: l.tipo,
          online: isOnline
        };
      }));


      mainWindow.webContents.send('hardware-status', {
        escola: config.escola_id,
        leitores: statusLeitores,
        sync: WorkerApi.online
      });

    }
  }, 5000);



  // Escutar configuração da UI (Seletor de Escola)
  ipcMain.handle('save-config', (_event, { escolaId, token, configHardware }) => {
    if (escolaId) {
        console.log(`[Config Web] Vinculando terminal à escola: ${escolaId}`);
        config.escola_id = escolaId;
    }
    if (token) config.agente_token = token;

    if (configHardware && Array.isArray(configHardware)) {
        console.log(`[Config Web] Persistindo ${configHardware.length} leitores localmente...`);
        salvarLeitoresNoDisco(configHardware);
        recarregarLeitores();

    }
    
    return { ok: true };
  });


  // Autenticação Digital via PIN (Eliminando erro de Rede/CORS no Browser)
  ipcMain.handle('login-pin', async (_event, pin) => {
    // 1. Fluxo Principal via Nuvem
    try {
      const url = `${config.endpoint_worker}/api/agente/login-pin`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      return await res.json();
    } catch (e: any) {
      console.warn('[Network] Falha na rede cloud:', e.message);
      
      // 2. Verificação de Backup/Admin Local (Acesso Offline de Emergência)
      if (pin === config.admin_pin) {
        console.log('[Auth] Acesso concedido via Senha Admin local (Fallback Offline).');
        return { 
          ok: true, 
          escola_id: config.escola_id, 
          escola_nome: 'ACESSANDO VIA ADMIN (OFFLINE)',
          token: config.agente_token,
          config_hardware: config.leitores 
        };
      }

      return { 
        ok: false, 
        mensagem: `Acesso à rede indisponível (${e.code || 'CLOUD_OFFLINE'}). Túnel possivelmente offline.` 
      };
    }
  });


  // --- Gestão de Usuários e Hardware Transferida para Nuvem ---

  ipcMain.handle('abrir-porta', async (_event, leitorId) => {
    const leitor = leitoresAtivos.find(l => l.id === leitorId);
    return leitor ? await leitor.abrirPorta() : false;
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

}

app.whenReady().then(async () => {
  iniciarServidorDescoberta();
  await createWindow();
  
  // Interceptar logs do terminal para exibir na Janela Visual
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  function repassarAoLogVisual(msg: string) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('new-log', msg);
    }
  }

  function safeStringify(a: any) {
    if (a instanceof Error) return a.message || String(a);
    if (typeof a === 'object') return JSON.stringify(a);
    return a;
  }

  console.log = (...args) => {
      originalLog(...args);
      repassarAoLogVisual(args.map(safeStringify).join(' '));
  };
  console.warn = (...args) => {
      originalWarn(...args);
      repassarAoLogVisual('[Aviso] ' + args.map(safeStringify).join(' '));
  };
  console.error = (...args) => {
      originalError(...args);
      repassarAoLogVisual('[Erro] ' + args.map(safeStringify).join(' '));
  };

  // Audio Feedback Service
  notificador = new NotificadorVoz(mainWindow);

  // Background Services — não devem impedir a abertura da janela
  try {
    iniciarPolling(notificador);
  } catch (e) {
    console.warn('[Agent] Poller de hardware falhou na inicialização (sem hardware conectado?):', e);
  }

  try {
    iniciarSync();
  } catch (e) {
    console.warn('[Agent] Sincronização com nuvem falhou na inicialização (servidor indisponível?):', e);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
