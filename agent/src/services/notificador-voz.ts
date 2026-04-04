/**
 * services/notificador-voz.ts
 * Notificador de áudio contextual (Premium TTS) para o Agente Local.
 * Utiliza o motor de fala do sistema operacional através do renderizador do Electron.
 */

import { BrowserWindow } from 'electron';
import { getSql } from '../infra/db';

export class NotificadorVoz {
  constructor(private window: BrowserWindow | null) {}

  /**
   * Enuncia uma mensagem para o ambiente escolar.
   * @param mensagem Texto a ser falado
   * @param prioridade Se deve interromper falas anteriores
   */
  async falar(mensagem: string, prioridade: boolean = true) {
    if (!this.window) return;

    const script = `
      if (window.speechSynthesis) {
        if (${prioridade}) window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("${mensagem}");
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    `;

    try {
      await this.window.webContents.executeJavaScript(script);
    } catch (e) {
      console.error('[NotificadorVoz] Erro ao disparar voz:', e);
    }
  }

  /** Anuncia acesso com base na configuração personalizada da nuvem */
  async anunciarAcesso(nome: string, tipo: string = 'ENTRADA') {
    try {
      // 1. Busca se o TTS está ativado e qual a frase
      const configAtivo = await getSql('SELECT valor FROM configuracoes_unidade WHERE chave = ?', ['ttsAtivado']);
      
      // Se não houver config ou for false, não fala
      if (configAtivo && configAtivo.valor === 'false') return;

      const configFrase = await getSql('SELECT valor FROM configuracoes_unidade WHERE chave = ?', ['ttsFrase']);
      
      // 2. Monta a mensagem (Fallback se não houver frase configurada)
      let msg = configFrase?.valor || 'Bem-vindo, {nome}!';
      
      // 3. Substitui placeholders dinâmicos
      const primeiroNome = nome.split(' ')[0];
      msg = msg.replace(/\{nome\}/g, primeiroNome);
      
      // 4. Se for SAÍDA e não tiver frase personalizada, usa adeus padrão
      if (tipo === 'SAIDA' && (!configFrase || configFrase.valor === 'Bem-vindo, {nome}!')) {
          msg = `Até logo, ${primeiroNome}!`;
      }

      await this.falar(msg);
    } catch (e) {
      // Fallback básico em caso de erro no banco
      const saudacao = new Date().getHours() < 12 ? 'Bom dia' : 'Boa tarde';
      await this.falar(`${saudacao}, ${nome.split(' ')[0]}.`);
    }
  }

  /** Atualiza apenas a UI (métricas) sem emitir voz */
  notificarAcessoVisual(nome: string, tipo: string = 'ENTRADA') {
    if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('new-access', { nome, tipo });
    }
  }
}
