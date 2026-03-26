/**
 * drivers/IdflexLeitor.ts
 * Implementação do driver iDFlex (ControlID) via API REST.
 */

import {
  ILeitor, EventoAcesso, DadosAluno, ResultadoCadastro,
  StatusLeitor, LeitorTcpConfig, TipoLeitor,
} from './ILeitor';
import { IdFlexHelper } from './IdFlexHelper';

export class IdflexLeitor implements ILeitor {
  readonly tipo = TipoLeitor.ID_FLEX;
  private tokenSessao?: string;

  constructor(private cfg: LeitorTcpConfig) {}

  get id() { return this.cfg.id; }
  get nome() { return this.cfg.nome; }

  private async requisitarComToken(endpoint: string, dados: any = {}) {
    if (!this.tokenSessao) {
      this.tokenSessao = await IdFlexHelper.login({ ip: this.cfg.ip });
    }
    try {
      return await IdFlexHelper.requisitar({ ip: this.cfg.ip, token: this.tokenSessao }, endpoint, dados);
    } catch (e: any) {
      if (e.message.includes('401') || e.message.includes('session')) {
        this.tokenSessao = await IdFlexHelper.login({ ip: this.cfg.ip });
        return await IdFlexHelper.requisitar({ ip: this.cfg.ip, token: this.tokenSessao }, endpoint, dados);
      }
      throw e;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await IdFlexHelper.requisitar({ ip: this.cfg.ip }, 'system_information.fcgi');
      return true;
    } catch { return false; }
  }

  async status(): Promise<StatusLeitor> {
    try {
      const resp = await this.requisitarComToken('system_information.fcgi');
      return {
        online: true,
        modelo: resp.model || 'iDFlex',
        serial: resp.serial_number,
      };
    } catch { return { online: false }; }
  }

  async buscarEventos(ultimoId = '0'): Promise<EventoAcesso[]> {
    try {
      const resp = await this.requisitarComToken('load_logs.fcgi', {
        min_id: parseInt(ultimoId, 10) + 1
      });

      return (resp.logs || []).map((l: any) => ({
        id: String(l.id),
        idUsuario: String(l.user_id),
        timestamp: new Date(l.time * 1000),
        tipo: 'ENTRADA', // iDFlex simplificado
        autorizado: l.event === 7, // 7 = acesso autorizado
        leitorId: this.id
      }));
    } catch (e) {
      console.error(`[Agente][${this.id}] Erro ao carregar logs iDFlex:`, e);
      return [];
    }
  }

  async cadastrarAluno(aluno: DadosAluno): Promise<ResultadoCadastro> {
    try {
      const idInterno = aluno.idInterno ?? parseInt(aluno.matricula.replace(/\D/g, '').slice(-8), 10);
      await this.requisitarComToken('set_db.fcgi', {
        collection: 'users',
        values: [{ id: idInterno, name: aluno.nomeCompleto, registration: aluno.matricula }]
      });

      return { ok: true, idInterno };
    } catch (e: any) {
      return { ok: false, erro: e.message };
    }
  }

  async removerAluno(matricula: string): Promise<boolean> {
    try {
      const idInterno = parseInt(matricula.replace(/\D/g, '').slice(-8), 10);
      await this.requisitarComToken('remove_db.fcgi', {
        collection: 'users',
        where: { id: idInterno }
      });
      return true;
    } catch { return false; }
  }
}
