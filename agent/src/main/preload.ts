import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('scaeApi', {
  onHardwareStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('hardware-status', (_event, status) => callback(status));
  },
  onNewLog: (callback: (log: string) => void) => {
    ipcRenderer.on('new-log', (_event, log) => callback(log));
  },
  saveConfig: (data: { escolaId: string }) => ipcRenderer.invoke('save-config', data)
});
