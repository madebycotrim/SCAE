/**
 * main/main.ts
 * Processo Principal do Electron - Agente Local SCAE v1.5
 * Hardware Real <-> Dashboard em Tempo Real
 */

import { app, BrowserWindow, nativeImage, ipcMain } from 'electron';
import path from 'path';
import { iniciarPolling, leitoresAtivos } from '../services/poller';
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
  ipcMain.handle('save-config', (_event, { escolaId }) => {
    console.log(`[Config] Vinculando terminal à escola: ${escolaId}`);
    config.escola_id = escolaId; // Atualiza em memória
    // Aqui poderíamos salvar de volta no .env ou SQLite se quiséssemos persistência persistente pura
    return { ok: true };
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(async () => {
  await createWindow();
  
  // Audio Feedback Service
  notificador = new NotificadorVoz(mainWindow);

  // Background Services
  iniciarPolling(notificador);
  iniciarSync();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
