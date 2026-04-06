/**
 * main/tray.ts
 * Gestão do ícone na bandeja do sistema (System Tray).
 */

import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import * as path from 'path';

let tray: Tray | null = null;

export function criarTray(mainWindow: BrowserWindow) {
  const iconPath = path.join(__dirname, 'CATRAKI.ico');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  tray.setToolTip('SCAE Agent - Local Cloud Connector');

  const contextMenu = Menu.buildFromTemplate([
    { label: '🖥️ Abrir Monitor de Agente', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: '🔄 Forçar Sincronização Agora', click: () => { /* Chamar serviço de sincronização */ } },
    { type: 'separator' },
    { label: '❌ Encerrar Agente', click: () => { app.exit(0); } },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });

  return tray;
}
