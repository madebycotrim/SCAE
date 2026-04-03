import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('scaeApi', {
  onHardwareStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('hardware-status', (_event, status) => callback(status));
  },
  onNewLog: (callback: (log: string) => void) => {
    ipcRenderer.on('new-log', (_event, log) => callback(log));
  },
  onNewAccess: (callback: (data: any) => void) => {
    ipcRenderer.on('new-access', (_event, data) => callback(data));
  },
  saveConfig: (data: { escolaId: string }) => ipcRenderer.invoke('save-config', data),
  loginPin: (pin: string) => ipcRenderer.invoke('login-pin', pin)
});
