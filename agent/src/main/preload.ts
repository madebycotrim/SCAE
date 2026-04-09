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
  salvarLeitores: (leitores: any[], ipAgente?: string) => ipcRenderer.invoke('salvar-leitores', { leitores, ipAgente }),
  reconectar: (leitorId: string) => ipcRenderer.invoke('reconectar-leitor', { leitorId }),
  resetDb: () => ipcRenderer.invoke('reset-db'),
  verificarPin: (pin: string) => ipcRenderer.invoke('verificar-pin', { pin }),
  backupDb: () => ipcRenderer.invoke('backup-db'),
  cadastrarAluno: (dados: any) => ipcRenderer.invoke('cadastrar-aluno', dados),
  iniciarCaptura: (dados: any) => ipcRenderer.invoke('iniciar-captura', dados),
  excluirAluno: (dados: any) => ipcRenderer.invoke('excluir-aluno', dados),
  registrarVisitante: (dados: any) => ipcRenderer.invoke('registrar-visitante', dados)
});
