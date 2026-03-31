/**
 * services/notificador-voz.ts
 * Notificador de áudio contextual (Premium TTS) para o Agente Local.
 * Utiliza o motor de fala do sistema operacional através do renderizador do Electron.
 */

import { BrowserWindow } from 'electron';

export class NotificadorVoz {
  constructor(private window: BrowserWindow | null) {}

  /**
   * Enuncia uma mensagem para o ambiente escolar.
   * @param mensagem Texto a ser falado (ex: "Bem-vindo, Mateus!")
   * @param prioridade Se deve interromper falas anteriores
   */
  async falar(mensagem: string, prioridade: boolean = true) {
    if (!this.window) return;

    // Injetamos o comando de voz diretamente no contexto web do monitor
    // Isso garante acesso ao motor nativo de fala via Web Speech API
    const script = `
      if (window.speechSynthesis) {
        if (${prioridade}) window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("${mensagem}");
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;
        utterance.pitch = 1.1; // Timbre levemente amigável
        window.speechSynthesis.speak(utterance);
      }
    `;

    try {
      await this.window.webContents.executeJavaScript(script);
    } catch (e) {
      console.error('[NotificadorVoz] Erro ao disparar voz:', e);
    }
  }

  /** Sugestão contextual baseada na batida */
  async anunciarAcesso(nome: string, tipo: string = 'ENTRADA') {
    const saudacao = new Date().getHours() < 12 ? 'Bom dia' : 'Boa tarde';
    const acao = tipo === 'ENTRADA' ? 'Bem-vindo' : 'Pode passar';
    const msg = `${saudacao}, ${nome.split(' ')[0]}. ${acao} ao Catraki!`;
    await this.falar(msg);
  }
}
