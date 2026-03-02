export type PapelUsuario = 'AGM' | 'ADMIN' | 'COORDENACAO' | 'SECRETARIA' | 'PORTARIA' | 'VISUALIZACAO';

export interface AlunoLocal {
    matricula: string;
    nome_completo: string;
    turma_id: string;
    ativo: boolean;
    criado_em?: string;
    atualizado_em?: string;
    sincronizado?: number; // 0 ou 1
    // Suporte para aliases legados nos componentes
    id?: string;
    nome?: string;
}

export interface TurmaLocal {
    id: string;
    ano_letivo: string;
    serie: string;
    turno: string;
    sala: string;
    professor_regente?: string;
    sincronizado?: number;
}

export interface RegistroAcessoLocal {
    id: string;
    aluno_matricula: string;
    tipo_movimentacao: 'ENTRADA' | 'SAIDA';
    timestamp: string;
    sincronizado: number;
}

export interface UsuarioLocal {
    email: string;
    papel: PapelUsuario;
    ativo: boolean;
    atualizado_em: string;
    nome_completo?: string;
    criado_em?: string;
    criado_por?: string;
    pendente?: boolean;
    // Suporte para aliases legados nos componentes
    role?: PapelUsuario;
}

export interface AlunoPresente extends RegistroAcessoLocal {
    nome_completo: string;
    matricula: string;
    turma_id: string;
}

export interface EsquemaSCAE {
    turmas: {
        key: string;
        value: TurmaLocal;
        indexes: { ano_letivo: string; serie: string; turno: string; sala: string };
    };
    alunos: {
        key: string;
        value: AlunoLocal;
        indexes: { turma_id: string; ativo: boolean; sincronizado: number };
    };
    registros_acesso: {
        key: string;
        value: RegistroAcessoLocal;
        indexes: { aluno_matricula: string; tipo_movimentacao: string; timestamp: string; sincronizado: number };
    };
    fila_pendencias: {
        key: string;
        value: {
            id: string;
            acao: string;
            colecao: string;
            dado_id: string;
            dados_extras: Record<string, unknown> | null;
            timestamp: string;
        };
        indexes: { colecao: string; timestamp: string };
    };
    logs_auditoria: {
        key: string;
        value: {
            id: string;
            timestamp: string;
            usuario_email: string;
            acao: string;
            entidade_tipo: string;
            entidade_id: string;
            dados_anteriores: string | null;
            dados_novos: string | null;
            ip_address: string;
            user_agent: string;
            created_at: string;
            sincronizado: number;
        };
        indexes: {
            timestamp: string;
            usuario_email: string;
            acao: string;
            entidade_tipo: string;
            entidade_id: string;
            sincronizado: number;
        };
    };
    usuarios: {
        key: string;
        value: UsuarioLocal;
        indexes: { papel: string; ativo: boolean };
    };
}

export interface FiltrosLog {
    usuarioEmail?: string;
    acao?: string;
    entidadeTipo?: string;
    dataInicio?: string;
    dataFim?: string;
}
