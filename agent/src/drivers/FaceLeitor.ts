/**
 * drivers/FaceLeitor.ts
 * Driver para reconhecimento facial local usando a câmera do computador.
 */

import {
  ILeitor, EventoAcesso, DadosAluno, ResultadoCadastro,
  StatusLeitor, LeitorConfig, TipoLeitor,
} from './ILeitor';

export class FaceLeitor implements ILeitor {
  readonly tipo = TipoLeitor.USB_HID; // Tratado como entrada direta
  private eventosPendentes: EventoAcesso[] = [];

  constructor(private cfg: LeitorConfig) {}

  get id() { return this.cfg.id; }
  get nome() { return this.cfg.nome; }

  async ping(): Promise<boolean> {
    return true; 
  }

  async status(): Promise<StatusLeitor> {
    return {
      online: true,
      modelo: 'Catraki Edge Facial Processor',
    };
  }

  async buscarEventos(ultimoId = '0'): Promise<EventoAcesso[]> {
    const list = [...this.eventosPendentes];
    this.eventosPendentes = [];
    return list;
  }

  /** Injetado pelo MonitorFacial ao reconhecer um rosto */
  injetarReconhecimento(matricula: string) {
    this.eventosPendentes.push({
      id: `FACE_${Date.now()}`,
      idUsuario: matricula,
      timestamp: new Date(),
      tipo: 'ENTRADA',
      autorizado: true,
      leitorId: this.id
    });
  }

  async cadastrarAluno(aluno: DadosAluno): Promise<ResultadoCadastro> {
    return { ok: true };
  }

  async removerAluno(matricula: string): Promise<boolean> {
    return true;
  }

  async abrirPorta(): Promise<boolean> {
    return false;
  }
}

