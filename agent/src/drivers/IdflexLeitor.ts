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
  get ip() { return this.cfg.ip; }
  get porta() { return this.cfg.porta; }

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
   * Cadastra aluno no iDFlex com inteligência de UPSERT.
   * Evita duplicar registros com a mesma matrícula.
   */
  async cadastrarAluno(aluno: DadosAluno): Promise<ResultadoCadastro> {
    try {
      // 1. Determinar o ID que usaremos (sempre o mesmo para a mesma matrícula)
      const matriculaNumerica = parseInt(aluno.matricula.replace(/\D/g, ''), 10);
      let idPretendido: number;
      if (!isNaN(matriculaNumerica) && matriculaNumerica > 0 && matriculaNumerica < 2147483647) {
        idPretendido = matriculaNumerica;
      } else {
        idPretendido = Math.abs(aluno.matricula.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)) % 2000000;
      }

      // 2. Verificar se já existe aluno com esta matrícula OU com este ID no hardware
      let idExistente: number | undefined;
      try {
        const buscaReg = await this.requisitarComToken('load_objects.fcgi', {
          object: 'users',
          where: { registration: aluno.matricula }
        });
        
        if (buscaReg?.users?.length > 0) {
          idExistente = buscaReg.users[0].id;
        } else {
          // Se não achou por matrícula, verifica se o ID que queremos usar já está ocupado
          const buscaId = await this.requisitarComToken('load_objects.fcgi', {
            object: 'users',
            where: { id: idPretendido }
          });
          if (buscaId?.users?.length > 0) idExistente = idPretendido;
        }
      } catch (e) {
        // Se falhar a busca (ex: hardware não suporta where), prossegue com tentativa de criação
      }

      if (idExistente) {
        // 3. JÁ EXISTE: Apenas atualiza o registro (evita erro UNIQUE)
        await this.requisitarComToken('modify_objects.fcgi', {
          object: 'users',
          where: { users: { id: idExistente } },
          values: { 
            id: idPretendido, // Garante que o ID final seja o determinístico (numérico)
            name: aluno.nomeCompleto, 
            registration: aluno.matricula // MANTÉM STRING ORIGINAL (Preserva zeros à esquerda)
          }
        });

        // Atualiza digitais se fornecidas (sobrescreve antigas do usuário)
        if (aluno.templates && aluno.templates.length > 0) {
          // Remove templates antigos primeiro para evitar erro de limite
          try {
            await this.requisitarComToken('destroy_objects.fcgi', {
              object: 'fingerprints',
              where: { fingerprints: { user_id: idExistente } }
            });
          } catch {}

          await this.requisitarComToken('create_objects.fcgi', {
            values: aluno.templates.map(t => ({ user_id: idExistente, template: t })),
            object: 'fingerprints'
          });
        }

        return { ok: true, idInterno: idExistente };
      }

      // 4. NÃO EXISTE EM LUGAR NENUM: Cria novo registro
      await this.requisitarComToken('create_objects.fcgi', {
        values: [{ id: idPretendido, name: aluno.nomeCompleto, registration: aluno.matricula }],
        object: 'users'
      });

      // Vínculo com grupo padrão (id: 1)
      try {
        await this.requisitarComToken('create_objects.fcgi', {
          values: [{ user_id: idPretendido, group_id: 1 }],
          object: 'user_groups'
        });
      } catch {}

      // Cadastra Digitais se fornecidas
      if (aluno.templates && aluno.templates.length > 0) {
        await this.requisitarComToken('create_objects.fcgi', {
          values: aluno.templates.map(t => ({ user_id: idPretendido, template: t })),
          object: 'fingerprints'
        });
      }

      await this.emitirBeep();
      this.lastCacheSync = 0;

      return { ok: true, idInterno: idPretendido };
    } catch (e: any) {
      console.error(`[iDFlex][${this.id}] Erro ao processar ${aluno.nomeCompleto}: ${e.message}`);
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
    console.log(`[iDFlex][${this.id}] Iniciando modo de captura biométrica para Usuário ID ${userId}...`);
    try {
      // Usamos sync:true e timeout de 60s para esperar a interação física completa
      await this.requisitarComToken('remote_enroll.fcgi', {
        user_id: userId,
        type: 'biometry',
        save: true,
        sync: true,
        panic_finger: 0
      }, 60000);
      
      console.log(`[iDFlex][${this.id}] Biometria vinculada com sucesso ao ID ${userId}.`);
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
      
      console.error(`[iDFlex][${this.id}] Falha na captura biometria: ${msgErro}`);
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

  /**
   * Altera o nome interno do equipamento no hardware (Hostname)
   */
  async setNomeDispositivo(nome: string): Promise<boolean> {
    try {
      // Tenta o parâmetro padrão de exibição (device_name)
      await this.requisitarComToken('set_configuration.fcgi', {
        general: { device_name: nome }
      });
      return true;
    } catch (e: any) {
      try {
        // Fallback para hostname se device_name falhar em firmwares antigos
        await this.requisitarComToken('set_configuration.fcgi', {
          general: { hostname: nome }
        });
        return true;
      } catch (err: any) {
        console.error(`[iDFlex][${this.id}] Erro ao alterar nome do dispositivo (device_name/hostname): ${err.message}`);
        return false;
      }
    }
  }

  /**
   * Configura o hardware para o 'Modo Escola Catraki':
   * 1. Sincroniza Horário (Brasília/Local)
   * 2. Ativa modo Push/Monitor apontando para este Agente Local
   * 3. Configura timeout de tela para ser amigável
   */
  async configurarModoEscola(ipAgente: string, portaAgente = 1912): Promise<boolean> {
    try {
      await this.sincronizarHorario();
      
      // Configura o Monitor (HTTP Push)
      // O hardware enviará um POST para este Agente sempre que um acesso ocorrer
      await this.requisitarComToken('set_configuration.fcgi', {
        monitor: {
          hostname: ipAgente,
          port: portaAgente,
          path: '/idflex-push'
        },
        general: {
           button_timeout: 5000,
           door_timeout: 3000
        }
      });
      console.log(`[iDFlex][${this.id}] Modo Tempo Real (Push) ativado para http://${ipAgente}:${portaAgente}/idflex-push`);
      return true;
    } catch (e: any) {
      console.error(`[iDFlex][${this.id}] Erro ao configurar modo escola: ${e.message}`);
      return false;
    }
  }

  /**
   * Consulta o hardware (iDFlex) para saber se um usuário possui digitais cadastradas.
   * Serve como 'prova real' física para sincronizar com o Cloud.
   * @param userId ID/Matrícula do aluno (sem zeros à esquerda para o hardware)
   */
  async verificarBiometriaNoHardware(userId: string): Promise<boolean> {
    try {
      // Normaliza o ID para o hardware (sem zeros)
      const idLimpo = parseInt(userId, 10);
      if (isNaN(idLimpo)) return false;

      // Consulta o objeto 'templates' (onde ficam as digitais)
      const res = await this.requisitarComToken('load_objects.fcgi', {
        object: "templates",
        where: { user_id: idLimpo }
      });

      // Se retornou algum template, a biometria existe fisicamente
      return res && res.templates && res.templates.length > 0;
    } catch (e: any) {
      console.error(`[iDFlex][${this.id}] Erro ao verificar biometria física para ${userId}: ${e.message}`);
      return false;
    }
  }
}

