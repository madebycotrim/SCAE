/**
 * drivers/ControlidUsbLeitor.ts
 * Implementação para o leitor biométrico USB iDBio da ControlID.
 * Geralmente funciona via porta serial (COM) ou como dispositivo HID.
 */

import {
  ILeitor, EventoAcesso, DadosAluno, ResultadoCadastro,
  StatusLeitor, LeitorConfig, TipoLeitor,
} from './ILeitor';

export class ControlidUsbLeitor implements ILeitor {
  readonly tipo = TipoLeitor.USB_HID;
  private eventosPendentes: EventoAcesso[] = [];
  private conectado = false;

  constructor(private cfg: LeitorConfig) {
    this.verificarStatus();
  }

  get id() { return this.cfg.id; }
  get nome() { return this.cfg.nome; }

  /**
   * Monitora se o leitor USB está fisicamente conectado ao sistema.
   * Em produção, isso usaria bibliotecas nativas como node-usb ou node-hid.
   */
  private async verificarStatus() {
    // Simula detecção de PnP para o dispositivo USB
    this.conectado = true; // Assume conectado no construtor
  }

  async ping(): Promise<boolean> {
    return this.conectado;
  }

  /**
   * Retorna informações sobre o leitor USB conectado.
   */
  async status(): Promise<StatusLeitor> {
    return {
      online: this.conectado,
      modelo: 'ControlID iDBio (USB)',
      serial: 'USB-PNP-DISCOVERY'
    };
  }

  /**
   * Busca eventos injetados no buffer do leitor.
   * Leitores USB geralmente enviam dados por evento, que o poller coleta aqui.
   */
  async buscarEventos(ultimoId = '0'): Promise<EventoAcesso[]> {
    const list = [...this.eventosPendentes];
    this.eventosPendentes = [];
    return list;
  }

  /**
   * Recebe uma leitura de digital ou cartão capturada via barramento USB/Teclado.
   */
  injetarLeitura(codigo: string) {
    this.eventosPendentes.push({
      id: `USB_${Date.now()}`,
      idUsuario: codigo,
      timestamp: new Date(),
      tipo: 'ENTRADA',
      autorizado: true,
      leitorId: this.id
    });
  }

  async cadastrarAluno(aluno: DadosAluno): Promise<ResultadoCadastro> {
    // Cadastro local em USB biometria geralmente depende de captura de imagem via SDK.
    // Atualmente retorna OK para persistência em cache se necessário.
    return { ok: true };
  }

  async removerAluno(matricula: string): Promise<boolean> {
    return true;
  }

  async abrirPorta(): Promise<boolean> {
    // Leitores USB solos raramente acionam portas (costumam fornecer apenas IDs para o PC).
    return true; 
  }
}
