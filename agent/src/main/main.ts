/**
 * main/main.ts
 * Processo Principal do Electron - Agente Local SCAE v1.5
 * Hardware Real <-> Dashboard em Tempo Real
 */

import { app, BrowserWindow, nativeImage, ipcMain } from 'electron';
import path from 'path';
import { iniciarPolling, leitoresAtivos, recarregarLeitores } from '../services/poller';
import { iniciarSync } from '../services/sync';
import { NotificadorVoz } from '../services/notificador-voz';
import { config } from '../infra/config';

let mainWindow: BrowserWindow | null = null;
let notificador: NotificadorVoz | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 680,
    resizable: false,
    maximizable: false,
    title: 'SCAE Edge Agent Control',
    icon: nativeImage.createEmpty(),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Broadcast de Status Real
  setInterval(() => {
    if (mainWindow) {
      mainWindow.webContents.send('hardware-status', {
        escola: config.escola_id,
        biometria: leitoresAtivos.length > 0,
        sync: true
      });
    }
  }, 10000);

  // Escutar configuração da UI (Seletor de Escola)
  ipcMain.handle('save-config', (_event, { escolaId, token, configHardware }) => {
    console.log(`[Config Web] Vinculando terminal à escola: ${escolaId}`);
    
    config.escola_id = escolaId;
    config.agente_token = token;

    // Se a nuvem mandou configuração de hardware, aplica agora
    if (configHardware && Array.isArray(configHardware) && configHardware.length > 0) {
        console.log(`[Config Web] Aplicando ${configHardware.length} leitores via remota.`);
        config.leitores = configHardware;
        recarregarLeitores();
    }
    
    return { ok: true };
  });

  // Autenticação Digital via PIN (Eliminando erro de Rede/CORS no Browser)
  ipcMain.handle('login-pin', async (_event, pin) => {
    try {
      const url = `${config.endpoint_worker}/api/agente/login-pin`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      return await res.json();
    } catch (e) {
      console.error('[Network] Erro ao autenticar PIN:', e);
      return { ok: false, mensagem: 'Servidor indisponível ou erro de rede local.' };
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(async () => {
  await createWindow();
  
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
