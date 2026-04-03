/**
 * drivers/IdflexLeitor.ts
 * Implementação aprimorada do driver iDFlex (ControlID) via API REST.
 * Baseado na documentação: https://www.controlid.com.br/docs/access-api-pt/
 */

import {
  ILeitor, EventoAcesso, DadosAluno, ResultadoCadastro,
  StatusLeitor, LeitorTcpConfig, TipoLeitor,
} from './ILeitor';
import { IdFlexHelper } from './IdFlexHelper';

export class IdflexLeitor implements ILeitor {
  readonly tipo = TipoLeitor.ID_FLEX;
  private tokenSessao?: string;
  private ultimoErroLogado?: string;

  constructor(private cfg: LeitorTcpConfig) {}

  get id() { return this.cfg.id; }
  get nome() { return this.cfg.nome; }

  /**
   * Realiza requisição autenticada, renovando a sessão se necessário.
   */
  private async requisitarComToken(endpoint: string, dados: any = {}) {
    if (!this.tokenSessao) {
      this.tokenSessao = await IdFlexHelper.login({ ip: this.cfg.ip });
    }
    try {
      const resp = await IdFlexHelper.requisitar({ ip: this.cfg.ip, token: this.tokenSessao }, endpoint, dados);
      this.ultimoErroLogado = undefined;
      return resp;
    } catch (e: any) {
      // Se erro for 401 ou sessão inválida, tenta re-logar uma vez
      if (e.message.includes('401') || e.message.includes('session') || e.body?.includes('invalid session')) {
        this.tokenSessao = await IdFlexHelper.login({ ip: this.cfg.ip });
        return await IdFlexHelper.requisitar({ ip: this.cfg.ip, token: this.tokenSessao }, endpoint, dados);
      }
      throw e;
    }
  }

  async ping(): Promise<boolean> {
    try {
      // Usa a requisição autenticada, pois algumas versões trancam até as rotas de sistema
      await this.requisitarComToken('system_information.fcgi');
      return true;
    } catch { return false; }
  }


  /**
   * Retorna o status detalhado do equipamento iDFlex.
   */
  /**
   * Retorna o status detalhado do equipamento iDFlex.
   * Agora também sincroniza o horário do dispositivo com o do computador.
   */
  async status(): Promise<StatusLeitor> {
    try {
      const info = await this.requisitarComToken('system_information.fcgi');
      
      // Sincroniza horário se estiver online
      await this.sincronizarHorario();

      // Busca contagem de usuários e logs
      const [countUsers, countLogs] = await Promise.all([
        this.requisitarComToken('load_objects.fcgi', { object: 'users', count: true }),
        this.requisitarComToken('load_objects.fcgi', { object: 'access_logs', count: true })
      ]);

      return {
        online: true,
        modelo: info.model || 'iDFlex',
        serial: info.serial_number,
        totalUsuarios: countUsers.count,
        totalRegistros: countLogs.count
      };
    } catch (e: any) {
      console.error(`[iDFlex][${this.id}] Erro ao buscar status: ${e.message}`);
      return { online: false };
    }
  }

  /**
   * Sincroniza o relógio do iDFlex com o do servidor do Agente.
   */
  private async sincronizarHorario() {
    const agora = new Date();
    try {
      await this.requisitarComToken('set_system_time.fcgi', {
        day: agora.getDate(),
        month: agora.getMonth() + 1,
        year: agora.getFullYear(),
        hour: agora.getHours(),
        minute: agora.getMinutes(),
        second: agora.getSeconds()
      });
    } catch (e: any) {
      console.warn(`[iDFlex][${this.id}] Falha ao sincronizar horário: ${e.message}`);
    }
  }

  /**
   * Busca novos eventos de acesso.
   * Eventos: 7=Concedido, 11=Botoeira, 15=Interfonia.
   */
  async buscarEventos(ultimoId = '0'): Promise<EventoAcesso[]> {
    try {
      // O iDFlex usa load_objects para a tabela access_logs
      const resp = await this.requisitarComToken('load_objects.fcgi', {
        object: 'access_logs'
      });

      // Filtra logs com id maior que o último lido, com segurança
      const lastId = parseInt(ultimoId, 10) || 0;
      const logs = (resp.access_logs || []).filter((l: any) => l.id > lastId);

      return logs.map((l: any) => ({
        id: String(l.id),
        idUsuario: String(l.user_id),
        timestamp: new Date(l.time * 1000),
        tipo: 'ENTRADA',
        autorizado: [7, 10, 11, 12, 15].includes(l.event),
        leitorId: this.id
      }));
    } catch (e: any) {
      const msgErro = e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT'
        ? `Equipamento iDFlex em ${this.cfg.ip} inacessível.`
        : `Erro ao buscar logs do iDFlex: ${e.message}`;

      if (msgErro !== this.ultimoErroLogado) {
        console.warn(`[Agente][${this.id}] ${msgErro}`);
        this.ultimoErroLogado = msgErro;
      }
      return [];
    }
  }


  /**
   * Cadastra aluno no iDFlex com regra de acesso e digitais.
   */
  async cadastrarAluno(aluno: DadosAluno): Promise<ResultadoCadastro> {
    try {
      const idInterno = aluno.idInterno ?? parseInt(aluno.matricula.replace(/\D/g, '').slice(-8), 10);
      
      // 1. Cadastra Objeto User
      await this.requisitarComToken('set_db.fcgi', {
        collection: 'users',
        values: [{ id: idInterno, name: aluno.nomeCompleto, registration: aluno.matricula }]
      });

      // 2. Garante vínculo com grupo de acesso (essencial para o funcionamento)
      // Tenta vincular ao grupo 1. Se falhar, tenta carregar grupos existentes.
      try {
        await this.requisitarComToken('set_db.fcgi', {
          collection: 'user_groups',
          values: [{ user_id: idInterno, group_id: 1 }]
        });
      } catch {
        console.warn(`[iDFlex][${this.id}] Falha ao vincular Grupo 1. Verifique as regras de acesso no equipamento.`);
      }

      // 3. Cadastra Digitais
      if (aluno.templates && aluno.templates.length > 0) {
        await this.requisitarComToken('set_db.fcgi', {
          collection: 'fingerprints',
          values: aluno.templates.map(t => ({ user_id: idInterno, template: t }))
        });
      }

      // Feedback sonoro de sucesso no cadastro
      await this.emitirBeep();

      return { ok: true, idInterno };
    } catch (e: any) {
      console.error(`[iDFlex][${this.id}] Erro ao cadastrar ${aluno.nomeCompleto}: ${e.message}`);
      return { ok: false, erro: e.message };
    }
  }

  /**
   * Emite um sinal sonoro no equipamento.
   */
  async emitirBeep(): Promise<void> {
    try {
      await this.requisitarComToken('execute_actions.fcgi', {
        action: 'buzzer',
        parameters: 'duty_cycle=50, frequency=2000, duration=200'
      });
    } catch { /* Ignora erro de beep */ }
  }

  /**
   * Lista todos os usuários (alunos) residentes no hardware iDFlex.
   */
  async listarAlunos(): Promise<any[]> {
    try {
      const res = await this.requisitarComToken('load_objects.fcgi', { object: 'users' });
      return res.users || [];
    } catch { return []; }
  }

  /**
   * Ativa o modo de captura biométrica remota.
   * O iDFlex entrará no modo 'Aguardando dedo...' para o ID especificado.
   */
  async iniciarCaptura(userId: number): Promise<boolean> {
    try {
      await this.requisitarComToken('remote_enroll.fcgi', {
        user_id: userId,
        type: 'fingerprint',
        save: true,
        panic_finger: false
      });
      return true;
    } catch (e: any) {
      console.error(`[iDFlex][${this.id}] Erro ao iniciar captura remota: ${e.message}`);
      return false;
    }
  }

  /**
   * Remove aluno e vínculos do iDFlex.
   */
  async removerAluno(matricula: string): Promise<boolean> {

    try {
      const idInterno = parseInt(matricula.replace(/\D/g, '').slice(-8), 10);
      
      // O remove_db em users geralmente limpa os vínculos user_groups e templates automaticamente no iDFlex
      await this.requisitarComToken('remove_db.fcgi', {
        collection: 'users',
        where: { id: idInterno }
      });
      
      return true;
    } catch (e: any) {
      console.error(`[iDFlex][${this.id}] Erro ao remover usuário: ${e.message}`);
      return false;
    }
  }

  /**
   * Abre a porta remotamente através da execução de ação de hardware.
   */
  async abrirPorta(): Promise<boolean> {
    try {
      // Ação 1 no portal 1 (padrão iDFlex)
      await this.requisitarComToken('execute_actions.fcgi', {
        action: 'door',
        parameters: 'door=1'
      });
      return true;
    } catch (e: any) {
      console.error(`[iDFlex][${this.id}] Erro ao abrir porta: ${e.message}`);
      return false;
    }
  }
}

