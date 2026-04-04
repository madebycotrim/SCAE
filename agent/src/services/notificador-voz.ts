/**
 * services/notificador-voz.ts
 * Notificador de áudio contextual (Premium TTS) para o Agente Local.
 * Utiliza o motor de fala do sistema operacional através do renderizador do Electron.
 */

import { BrowserWindow } from 'electron';
import { getSql } from '../infra/db';

export class NotificadorVoz {
  constructor(private window: BrowserWindow | null) {}

  /** Enuncia uma mensagem para o ambiente escolar. */
  async falar(mensagem: string, prioridade: boolean = true) {
    if (!this.window || this.window.isDestroyed()) return;
    const safeMsg = mensagem.replace(/"/g, "'").replace(/(\r\n|\n|\r)/gm, "");
    
    const script = `
      if (window.speechSynthesis) {
        if (${prioridade}) window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("${safeMsg}");
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    `;

    try {
      await this.window.webContents.executeJavaScript(script);
    } catch (e) {
      console.error('[NotificadorVoz] Erro:', e);
    }
  }

  /** Anuncia acesso com base na configuração personalizada da nuvem */
  async anunciarAcesso(nome: string, tipo: string = 'ENTRADA') {
    const ehSucesso = tipo === 'ENTRA' || tipo === 'SAIDA' || tipo === 'ENTRADA';
    
    try {
      // 1. Busca se o TTS está ativado no SQLite local
      const configAtivo = await getSql('SELECT valor FROM configuracoes_unidade WHERE chave = ?', ['ttsAtivado']);
      const valorConfig = configAtivo?.valor;
      
      // Forçar legado (falar) se não houver configuração ainda
      const ttsLigado = (valorConfig === 'true' || valorConfig === '1' || valorConfig === undefined || valorConfig === null); 
      
      console.log(`[TTS] Ativo: ${ttsLigado} | Valor: "${valorConfig}"`);
      if (!ttsLigado) return;

      // 2. Busca a frase no SQLite local
      const chaveFrase = ehSucesso ? 'ttsFraseSucesso' : 'ttsFraseErro';
      const row = await getSql('SELECT valor FROM configuracoes_unidade WHERE chave = ?', [chaveFrase]);
      console.log(`[TTS] Chave: ${chaveFrase} | Encontrado: "${row?.valor}"`);
      
      // 3. Monta a mensagem final (com fallbacks)
      let msg = row?.valor || '';
      
      if (!msg || msg === 'undefined') {
          msg = ehSucesso ? 'Bem-vindo, {nome}!' : 'Acesso negado.';
      }
      
      // 4. Substitui placeholders dinâmicos
      const primeiroNome = nome ? nome.split(' ')[0] : 'colega';
      msg = msg.replace(/\{nome\}/g, primeiroNome);
      
      // 5. Caso especial: SAÍDA sem frase personalizada
      if (tipo === 'SAIDA' && (msg === 'Bem-vindo, {nome}!' || !row)) {
          msg = `Até logo, ${primeiroNome}!`;
      }

      console.log(`[TTS] Falando: "${msg}" (Config: ${row?.valor ? 'Personalizada' : 'Padrão'})`);
      await this.falar(msg);

    } catch (e: any) {
      console.error('[TTS] Erro:', e.message);
      const primeiroNome = nome ? nome.split(' ')[0] : 'colega';
      const msgFallback = ehSucesso ? `Olá, ${primeiroNome}!` : 'Acesso negado.';
      await this.falar(msgFallback);
    }
  }

  /** Atualiza apenas a UI (métricas) sem emitir voz */
  notificarAcessoVisual(nome: string, tipo: string = 'ENTRADA') {
    if (this.window && !this.window.isDestroyed()) {
        const sucesso = tipo === 'ENTRADA' || tipo === 'SAIDA';
        this.window.webContents.send('new-access', { nome, sucesso });
    }
  }
}
