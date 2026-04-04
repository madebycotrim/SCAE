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
  private cacheNomes = new Map<string, { nome: string, matricula: string }>();
  private lastCacheSync = 0;

  constructor(private cfg: LeitorTcpConfig) {}

  get id() { return this.cfg.id; }
  get nome() { return this.cfg.nome; }

  private async requisitarComToken(endpoint: string, dados: any = {}, timeout?: number) {
    if (!this.tokenSessao) {
      this.tokenSessao = await IdFlexHelper.login({ ip: this.cfg.ip });
    }
    try {
      const resp = await IdFlexHelper.requisitar({ ip: this.cfg.ip, token: this.tokenSessao }, endpoint, dados, timeout);
      this.ultimoErroLogado = undefined;
      return resp;
    } catch (e: any) {
      // Se erro for 401 ou sessão inválida, tenta re-logar uma vez
      if (e.message.includes('401') || e.message.includes('session') || e.body?.includes('invalid session')) {
        this.tokenSessao = await IdFlexHelper.login({ ip: this.cfg.ip });
        return await IdFlexHelper.requisitar({ ip: this.cfg.ip, token: this.tokenSessao }, endpoint, dados, timeout);
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
      await this.sincronizarCacheNomesHardware();
      // O iDFlex usa load_objects para a tabela access_logs
      const resp = await this.requisitarComToken('load_objects.fcgi', {
        object: 'access_logs'
      });

      // Filtra logs com id maior que o último lido, com segurança
      const lastId = parseInt(ultimoId, 10) || 0;
      const logs = (resp.access_logs || []).filter((l: any) => l.id > lastId);

      // Mapeamento enriquecido: Busca o nome e matrícula do hardware para o dashboard
      return Promise.all(logs.map(async (l: any) => {
        const info = await this.obterDadosUsuarioHardware(String(l.user_id));
        return {
          id: String(l.id),
          idUsuario: String(l.user_id),
          matricula: info.matricula, // Novo campo habilitado
          nomeHardware: info.nome,   // Novo campo habilitado
          timestamp: new Date(l.time * 1000),
          tipo: 'ENTRADA',
          autorizado: [7, 10, 11, 12, 15].includes(l.event),
          leitorId: this.id
        };
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
      // Gera um ID interno aleatório para o hardware (evita colisões)
      const idInterno = Math.floor(Math.random() * 900000) + 100000;

      // 1. Cadastra Objeto User (ID aleatório + Matrícula preservada)
      await this.requisitarComToken('create_objects.fcgi', {
        values: [{ id: idInterno, name: aluno.nomeCompleto, registration: aluno.matricula }],
        object: 'users'
      });

      // 2. Garante vínculo com grupo de acesso
      try {
        await this.requisitarComToken('create_objects.fcgi', {
          values: [{ user_id: idInterno, group_id: 1 }],
          object: 'user_groups'
        });
      } catch { /* ... */ }

      // 3. Cadastra Digitais
      if (aluno.templates && aluno.templates.length > 0) {
        await this.requisitarComToken('create_objects.fcgi', {
          values: aluno.templates.map(t => ({ user_id: idInterno, template: t })),
          object: 'fingerprints'
        });
      }

      // Feedback sonoro e limpeza de cache para atualização imediata na UI
      await this.emitirBeep();
      this.lastCacheSync = 0; // Força sincronismo de nomes no próximo poll

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

  async listarAlunos(): Promise<any[]> {
    try {
      const res = await this.requisitarComToken('load_objects.fcgi', { object: 'users' });
      return res.users || [];
    } catch { return []; }
  }

  /** Sincroniza todos os nomes/matrículas do hardware para o cache local do driver */
  private async sincronizarCacheNomesHardware(force = false): Promise<void> {
    const now = Date.now();
    // Cache de 30 segundos em modo poller, ou imediato se forçado (novo cadastro/ID não encontrado)
    if (!force && (now - this.lastCacheSync < 30000) && this.cacheNomes.size > 0) return;

    try {
      const resp = await this.requisitarComToken('load_objects.fcgi', { object: 'users' });
      const users = resp.users || [];
      this.cacheNomes.clear();
      for (const u of users) {
        this.cacheNomes.set(String(u.id), { 
          nome: u.name || `ID ${u.id}`, 
          matricula: u.registration || '—' 
        });
      }
      this.lastCacheSync = now;
    } catch { /* erro silenciado */ }
  }

  /** Exibe uma mensagem de texto na tela do equipamento iDFlex físico */
  async exibirMensagemHardware(message: string, timeout = 3000): Promise<void> {
    try {
      await this.requisitarComToken('message_to_screen.fcgi', { message, timeout });
    } catch { /* ... */ }
  }

  private obterDadosUsuarioHardware(id: string): { nome: string, matricula: string } {
    if (this.cacheNomes.has(id)) return this.cacheNomes.get(id)!;
    
    // Tratamento amigável para usuários não cadastrados ou desconhecidos no hardware
    const nomeAmigavel = id === '0' ? 'ACESSO NÃO RECONHECIDO' : `DESCONHECIDO (ID: ${id})`;
    return { nome: nomeAmigavel, matricula: '—' };
  }

  /**
   * Ativa o modo de captura biométrica remota.
   * O iDFlex entrará no modo 'Aguardando dedo...' para o ID especificado.
   */
  async iniciarCaptura(userId: number): Promise<boolean> {
    try {
      // Usamos sync:true e timeout de 60s para esperar a interação física completa
      await this.requisitarComToken('remote_enroll.fcgi', {
        user_id: userId,
        type: 'biometry',
        save: true,
        sync: true,
        panic_finger: 0
      }, 60000);
      return true;
    } catch (e: any) {
      // Extrai a mensagem de erro real do hardware para o Dashboard
      let msgErro = e.message;
      try {
          if (e.body) {
              const body = JSON.parse(e.body);
              if (body.error) msgErro = body.error;
          }
      } catch {}
      
      console.error(`[iDFlex][${this.id}] Erro na captura: ${msgErro}`);
      throw new Error(msgErro || 'Falha na captura física.');
    }
  }

  /**
   * Remove aluno e vínculos do iDFlex.
   */
  async removerAluno(matricula: string): Promise<boolean> {
    try {
      // 1. Busca o ID técnico do hardware através da matrícula (registration)
      const resp = await this.requisitarComToken('load_objects.fcgi', { 
        object: 'users',
        where: { users: { registration: matricula } }
      });

      if (!resp.users || resp.users.length === 0) return false;
      const idInterno = resp.users[0].id;
      
      // 2. Remove o registro definitivo usando o ID real do hardware
      await this.requisitarComToken('destroy_objects.fcgi', {
        object: 'users',
        where: { users: { id: idInterno } }
      });
      
      this.cacheNomes.delete(String(idInterno));
      this.lastCacheSync = 0;
      return true;
    } catch (e: any) {
      console.error(`[iDFlex][${this.id}] Erro ao remover usuário matrícula ${matricula}: ${e.message}`);
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

