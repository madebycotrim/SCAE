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
  loginPin: (pin: string) => ipcRenderer.invoke('login-pin', pin),
  
  // Gestão de Usuários no Hardware
  listarAlunos: (leitorId: string) => ipcRenderer.invoke('listar-alunos', leitorId),
  cadastrarAluno: (dados: any) => ipcRenderer.invoke('cadastrar-aluno', dados),
  iniciarCaptura: (dados: any) => ipcRenderer.invoke('iniciar-captura', dados),
  excluirAluno: (dados: any) => ipcRenderer.invoke('excluir-aluno', dados)
});
