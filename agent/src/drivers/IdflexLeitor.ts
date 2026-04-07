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
  readonly tipo: TipoLeitor;
  private tokenSessao?: string;
  private ultimoErroLogado?: string;
  private cacheNomes = new Map<string, { nome: string, matricula: string }>();
  private lastCacheSync = 0;

  constructor(private cfg: LeitorTcpConfig) {
    this.tipo = cfg.tipo;
  }

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
      if (resp && resp.error) {
          throw new Error(resp.error);
      }
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

      // Busca dados reais (contagem manual é mais confiável em firmwares antigos)
      const [respUsers, respLogs] = await Promise.all([
        this.requisitarComToken('load_objects.fcgi', { object: 'users' }),
        this.requisitarComToken('load_objects.fcgi', { object: 'access_logs', count: true })
      ]);

      const users = respUsers.users || [];

      return {
        online: true,
        modelo: info.model || 'iDFlex',
        serial: info.serial_number,
        totalUsuarios: users.length,
        totalRegistros: respLogs.count || 0
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
          // Sucessos: 6(Identificado por Regra), 7(Identificado), 10(Remoto), 11(Botao), 12(Web), 14(QR), 15(Interfone), 16(QR), 31(Soft)
          autorizado: [6, 7, 10, 11, 12, 14, 15, 16, 31].includes(l.event),
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
   * Consulta o equipamento para saber qual o ID do último registro de log (access_logs)
   * criado. Usado para inicializar o cursor de leitura em bancos novos.
   */
  async buscarUltimoIdLog(): Promise<number> {
    try {
      // O iDFlex frequentemente rejeita comandos complexos de 'order' e 'limit'.
      // Portanto, buscamos os logs (o hardware internaliza limites razoáveis de página)
      // e pegamos o ID do último elemento retornado pela API.
      const resp = await this.requisitarComToken('load_objects.fcgi', {
        object: 'access_logs'
      });
      
      const logs = resp.access_logs || [];
      if (logs.length > 0) {
          const ultimoLog = logs[logs.length - 1]; // Array vem em ordem cronológica
          return parseInt(ultimoLog.id, 10);
      }
      return 0;
    } catch (e: any) {
      console.warn(`[iDFlex][${this.id}] Falha ao buscar último ID de log. Usando zero. Erro: ${e.message}`);
      return 0;
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
        // iDFlex (load_objects): Onde 'where' deve ser PLANO (campos diretos)
        const buscaReg = await this.requisitarComToken('load_objects.fcgi', {
          object: 'users',
          where: { users: { registration: aluno.matricula } }
        });
        
        if (buscaReg?.users?.length > 0) {
          idExistente = buscaReg.users[0].id;
        } else {
          // Se não achou por matrícula, verifica se o ID que queremos usar (o numérico) já está ocupado
          const buscaId = await this.requisitarComToken('load_objects.fcgi', {
            object: 'users',
            where: { users: { id: idPretendido } }
          });
          if (buscaId?.users?.length > 0) idExistente = idPretendido;
        }
      } catch (e) {
        // Se falhar a busca (ex: hardware não suporta where), prossegue e o create_objects retornará erro se existir
      }

      if (idExistente) {
        // 3. JÁ EXISTE: Apenas atualiza o registro (Sintaxe 'modify' exige aninhamento no where)
        await this.requisitarComToken('modify_objects.fcgi', {
          object: 'users',
          where: { users: { id: idExistente } },
          values: { 
            name: aluno.nomeCompleto, 
            registration: aluno.matricula 
          }
        });

        // Atualiza digitais se fornecidas (sobrescreve antigas do usuário)
        if (aluno.templates && aluno.templates.length > 0) {
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

  /**
   * Emite um sinal de erro (beep longo).
   */
  async emitirBeepErro(): Promise<void> {
    try {
      await this.requisitarComToken('execute_actions.fcgi', {
        action: 'buzzer',
        parameters: 'duty_cycle=50, frequency=500, duration=1000'
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
   * Ativa o modo de captura biométrica remota com auto-recuperação de aluno inexistente.
   */
  async iniciarCaptura(userId: number): Promise<boolean> {
    console.log(`[iDFlex][${this.id}] Iniciando modo de captura biométrica para Usuário ID ${userId}...`);
    try {
      // 0. LIMPEZA PREVENTIVA: Garante que não existam biometrias antigas para este ID
      // Isso evita duplicados se o hardware já tiver um template fantasma
      try {
        await this.requisitarComToken('destroy_objects.fcgi', {
          object: 'fingerprints',
          where: { fingerprints: { user_id: userId } }
        });
      } catch {}

      // 1. TENTATIVA DIRETA DE ENROLL
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
      let msgErro = e.message;
      let bodyErro: any = {};
      try { if (e.body) bodyErro = JSON.parse(e.body); } catch {}

      // 2. SE O USUÁRIO NÃO EXISTIR NO HARDWARE: Cria e Tenta Novamente (Self-Healing)
      const userNotFound = msgErro.toLowerCase().includes('not found') || 
                           bodyErro.error?.toLowerCase().includes('not found') ||
                           bodyErro.error?.toLowerCase().includes('inexistente');

      if (userNotFound) {
        console.warn(`[iDFlex][${this.id}] Aluno ${userId} não existe no hardware. Criando registro fantasma e repetindo...`);
        try {
          // Cria usuário mínimo no iDFlex para permitir o Enroll
          await this.cadastrarAluno({
            matricula: String(userId),
            nomeCompleto: "NOVO ALUNO (SYNC EM CURSO)"
          });
          
          await new Promise(r => setTimeout(r, 1500)); // Espera o banco interno

          // Nova tentativa de Enroll
          await this.requisitarComToken('remote_enroll.fcgi', {
            user_id: userId,
            type: 'biometry',
            save: true,
            sync: true
          }, 60000);
          
          console.log(`[iDFlex][${this.id}] Biometria vinculada com sucesso após auto-criação do ID ${userId}.`);
          return true;
        } catch (errRetry: any) {
           msgErro = errRetry.message;
        }
      }
      
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
      
      // 2. Limpeza Preventiva: Remove biometrias antes do usuário
      try {
        await this.requisitarComToken('destroy_objects.fcgi', {
          object: 'fingerprints',
          where: { fingerprints: { user_id: idInterno } }
        });
      } catch {}

      // 3. Remove o registro definitivo usando o ID real do hardware
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
      // O hardware enviará um POST para este Agente sempre que um acesso ocorrer.
      // IMPORTANTE: Alguns hardwares iDFlex esperam a porta como STRING.
      await this.requisitarComToken('set_configuration.fcgi', {
        monitor: {
          hostname: ipAgente,
          port: String(portaAgente),
          path: '/idflex-push'
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
   * Consulta o hardware (iDFlex) para saber quais usuários possuem digitais cadastradas.
   * Retorna um Set de IDs (Matrículas numéricas) para conferência rápida.
   */
  async obterMapaBiometriaHardware(): Promise<Set<number>> {
    try {
      // Puxa todos os templates (user_id) de uma vez
      const res = await this.requisitarComToken('load_objects.fcgi', {
        object: "templates",
        columns: ["user_id"]
      });

      const ids = new Set<number>();
      if (res && res.templates) {
          for (const t of res.templates) ids.add(t.user_id);
      }
      return ids;
    } catch (e: any) {
        console.error(`[iDFlex][${this.id}][Re] Erro ao carregar mapa de biometria: ${e.message}`);
        return new Set();
    }
  }
}

