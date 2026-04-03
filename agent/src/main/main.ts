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
    // 1. Verificação de Backup/Admin Local (Permitir acesso se a nuvem cair)
    if (pin === config.admin_pin) {
      console.log('[Auth] Acesso concedido via Senha Admin local.');
      return { 
        ok: true, 
        escola_id: config.escola_id, 
        escola_nome: 'ACESSANDO VIA ADMIN (OFFLINE)',
        token: config.agente_token,
        config_hardware: config.leitores 
      };
    }

    // 2. Fluxo Normal via Nuvem
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
      return { 
        ok: false, 
        mensagem: `DNS inviável ou servidor indisponível (${e.code || 'CLOUD_OFFLINE'}). Tente a Senha Admin local.` 
      };
    }
  });


  // --- Gestão de Usuários e Hardware ---
  ipcMain.handle('listar-alunos', async (_event, leitorId) => {
    const leitor = leitoresAtivos.find(l => l.id === leitorId);
    return (leitor && leitor.listarAlunos) ? await leitor.listarAlunos() : [];
  });

  ipcMain.handle('iniciar-captura', async (_event, { leitorId, userId }) => {
    const leitor = leitoresAtivos.find(l => l.id === leitorId);
    return (leitor && leitor.iniciarCaptura) ? await leitor.iniciarCaptura(userId) : false;
  });

  ipcMain.handle('cadastrar-aluno', async (_event, { leitorId, aluno }) => {
    const leitor = leitoresAtivos.find(l => l.id === leitorId);
    return leitor ? await leitor.cadastrarAluno(aluno) : { ok: false, erro: 'Leitor offline' };
  });

  ipcMain.handle('excluir-aluno', async (_event, { leitorId, matricula }) => {
    const leitor = leitoresAtivos.find(l => l.id === leitorId);
    return leitor ? await leitor.removerAluno(matricula) : false;
  });

  ipcMain.handle('abrir-porta', async (_event, leitorId) => {
    const leitor = leitoresAtivos.find(l => l.id === leitorId);
    return leitor ? await leitor.abrirPorta() : false;
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

}

app.whenReady().then(async () => {
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

  console.log = (...args) => {
      originalLog(...args);
      repassarAoLogVisual(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
  };
  console.warn = (...args) => {
      originalWarn(...args);
      repassarAoLogVisual('[Aviso] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
  };
  console.error = (...args) => {
      originalError(...args);
      repassarAoLogVisual('[Erro] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
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
