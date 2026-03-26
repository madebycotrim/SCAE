/**
 * drivers/UsbLeitor.ts
 * Implementação simplificada para leitores USB HID (RFID/Teclado).
 * Emula comportamento de um hardware fixo para compatibilidade de interface.
 */

import {
  ILeitor, EventoAcesso, DadosAluno, ResultadoCadastro,
  StatusLeitor, LeitorConfig, TipoLeitor,
} from './ILeitor';

export class UsbLeitor implements ILeitor {
  readonly tipo = TipoLeitor.USB_HID;
  private eventosPendentes: EventoAcesso[] = [];

  constructor(private cfg: LeitorConfig) {}

  get id() { return this.cfg.id; }
  get nome() { return this.cfg.nome; }

  async ping(): Promise<boolean> {
    return true; // Assume USB presente se o agente está rodando
  }

  async status(): Promise<StatusLeitor> {
    return {
      online: true,
      modelo: 'USB HID Generic',
    };
  }

  /** Captura ID do USB via entrada de teclado emulada ou similar no ambiente Electron */
  async buscarEventos(ultimoId = '0'): Promise<EventoAcesso[]> {
    const list = [...this.eventosPendentes];
    this.eventosPendentes = []; // Limpa fila local
    return list;
  }

  /** Simula injeção de evento pelo agente local (capturado via main process de eventos de teclado) */
  injetarLeitura(codigo: string) {
    this.eventosPendentes.push({
      id: Date.now().toString(),
      idUsuario: codigo,
      timestamp: new Date(),
      tipo: 'ENTRADA',
      autorizado: true,
      leitorId: this.id
    });
  }

  async cadastrarAluno(aluno: DadosAluno): Promise<ResultadoCadastro> {
    // Leitores USB HID não possuem banco de dados interno
    return { ok: true };
  }

  async removerAluno(matricula: string): Promise<boolean> {
    return true;
  }
}
