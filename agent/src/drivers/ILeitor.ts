/**
 * interfaces/ILeitor.ts
 * Abstração universal para leitores de biometria e RFID.
 */

export enum TipoLeitor {
  ID_FLEX = 'ID_FLEX'
}


export type TipoMovimentacao = 'ENTRADA' | 'SAIDA';

export interface EventoAcesso {
  id: string;
  idUsuario: string; // ID Técnico (random)
  matricula?: string; // Matrícula Real (registration)
  nomeHardware?: string; // Nome vindo do hardware
  timestamp: Date;
  tipo: TipoMovimentacao;
  autorizado: boolean;
  leitorId?: string;
}

export interface DadosAluno {
  matricula: string;
  nomeCompleto: string;
  idInterno?: number;  // ID numérico no hardware
  templates?: string[]; // Templates biométricos
}

export interface ResultadoCadastro {
  ok: boolean;
  idInterno?: number;
  erro?: string;
}

export interface StatusLeitor {
  online: boolean;
  modelo?: string;
  serial?: string;
  totalUsuarios?: number;
  totalRegistros?: number;
}

export interface LeitorConfig {
  id: string;
  nome: string;
  tipo: TipoLeitor;
}

export interface LeitorTcpConfig extends LeitorConfig {
  ip: string;
  porta: number;
  token?: string;
}

export interface ILeitor {
  readonly tipo: TipoLeitor;
  readonly id: string;
  readonly nome: string;
  readonly ip: string;
  readonly porta: number;

  /** Verifica se o hardware está acessível */
  ping(): Promise<boolean>;

  /** Retorna o status detalhado do hardware */
  status(): Promise<StatusLeitor>;

  /** Busca novos registros de acesso desde o último ID processado */
  buscarEventos(ultimoId?: string): Promise<EventoAcesso[]>;

  /** Cadastra um novo usuário no hardware */
  cadastrarAluno(aluno: DadosAluno): Promise<ResultadoCadastro>;

  /** Remove um usuário do hardware */
  removerAluno(matricula: string): Promise<boolean>;

  /** Aciona a abertura da porta/catraca remotamente */
  abrirPorta(): Promise<boolean>;

  /** Exibe uma mensagem de texto na tela do equipamento */
  exibirMensagemHardware(message: string, timeout?: number): Promise<void>;

  /** Retorna a lista de usuários (alunos) residentes no hardware */
  listarAlunos?(): Promise<any[]>;

  /** Inicia o modo de captura biométrica no equipamento */
  iniciarCaptura?(userId: number): Promise<boolean>;

  /** Altera o nome interno do equipamento no hardware (Hostname) */
  setNomeDispositivo?(nome: string): Promise<boolean>;
}


