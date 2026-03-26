/**
 * main/tray.ts
 * Gestão do ícone na bandeja do sistema (System Tray).
 */

import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';

let tray: Tray | null = null;

export function criarTray(mainWindow: BrowserWindow) {
  // Ícone em base64 (substituir por arquivo real para 100% de qualidade visual)
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAByElEQVRYR+2Xz0vVURTFP/f9vX+A0SiaREpRRBRBBUW0CKJF0SJoU0SLoE0RLYI2RbQI2nTOfU+633Nf076Xvof+CnoOnOfcvO+ee3Luey/9X674G7AAnAKHwFnwDPwBPuXeeS08As+Aa+AleK6Kj8BT8FT8Azj/X4C2f7yGtg9Anv8V6CswAG0fAOf+CujnPgAF/pXqM9D2Echzn4N+7nPQ9pXqEnBofpT7W3UFODQ/yv2tmge+AFPgGTD7K1VpYK4fS3/rAd96o6S/A9WpSgOf9GfW+6fT/9T0n88M9C818Enf99D8P3f9Z5zN/T/wTf898N27AonpX+XvS6A9mAn6Xm/7Iu86vOn+P7H1QEnf9/BOP9T93fUuVAnUfNMeAn8C8XInAALvY8Ab3pU/9w96uU0v3/RyW96O9W8L7f9G9Y836uU2vS66uOnyNfBbeS+Xf+jlNr0uum7L8fBbeS+X/9DLa/S76Oq67M8Anf9D9Y97vY6v26/lYm89f/1f6P+P9vIu2m2rG6WvS6A9mA3ay/7vdf8P9L9XvYqOn/U1fALvY5mAdzH+O6gBqgGqAaoB/wXoZegF6AXoRegF6AXoBegVfAVfwT8D9Ar+AAAA//8vC1R2AA==',
  );

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
