export type PapelUsuario = 'CENTRAL' | 'ADMIN' | 'COORDENACAO' | 'SECRETARIA' | 'PORTEIRO' | 'VISUALIZACAO';

export interface AlunoLocal {
    matricula: string;
    escola_id: string;
    nome_completo: string;
    turma_id: string;
    ativo: boolean;
    // LGPD
    base_legal?: string;
    finalidade_coleta?: string;
    data_exclusao?: string;
    // Tracking
    criado_em?: string;
    atualizado_em?: string;
    sincronizado?: number; // 0 = pendente | 1 = sincronizado
    // Aliases legados
    id?: string;
    nome?: string;
}

export interface TurmaLocal {
    id: string;
    escola_id: string;
    ano_letivo: string;
    serie: string;
    letra?: string;              // Ex: 'A', 'B'
    turno: string;
    sala: string;
    professor_regente?: string;
    sincronizado?: number;       // 0 = pendente | 1 = sincronizado
    criado_em?: string;
}

export interface RegistroAcessoLocal {
    id: string;
    escola_id: string;
    aluno_matricula: string;
    tipo_movimentacao: 'ENTRADA' | 'SAIDA';
    timestamp: string;           // campo local (mapeado p/ timestamp_acesso no servidor)
    metodo_leitura?: string;     // 'qr_celular' | 'qr_carteirinha' | 'manual'
    sincronizado: number;        // 0 = pendente | 1 = sincronizado
}

export interface UsuarioLocal {
    email: string;
    escola_id: string;
    papel: PapelUsuario;
    ativo: boolean;
    nome_completo?: string;
    criado_em?: string;
    atualizado_em?: string;
    criado_por?: string;         // email de quem criou (nullable)
    pendente?: boolean;          // aguardando aprovação
    data_exclusao?: string;
    // Alias legado
    role?: PapelUsuario;
}

export interface ResponsavelLocal {
    id: string;
    escola_id: string;
    nome_completo: string;
    email: string;
    base_legal: string;
    finalidade_coleta: string;
    criado_em?: string;
    atualizado_em?: string;
    data_exclusao?: string;
}

export interface VinculoResponsavelAluno {
    responsavel_id: string;
    aluno_matricula: string;
    escola_id: string;
    data_vinculo?: string;
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
        indexes: { escola_id: string; ano_letivo: string; serie: string; turno: string; sala: string };
    };
    alunos: {
        key: string;
        value: AlunoLocal;
        indexes: { escola_id: string; turma_id: string; ativo: boolean; sincronizado: number };
    };
    registros_acesso: {
        key: string;
        value: RegistroAcessoLocal;
        indexes: { escola_id: string; aluno_matricula: string; tipo_movimentacao: string; timestamp: string; sincronizado: number };
    };
    fila_pendencias: {
        key: string;
        value: {
            id: string;
            escola_id?: string;
            acao: string;
            colecao: string;
            dado_id: string;
            dados_extras: Record<string, unknown> | null;
            timestamp: string;
        };
        indexes: { escola_id: string; colecao: string; timestamp: string };
    };
    logs_auditoria: {
        key: string;
        value: {
            id: string;
            escola_id?: string;          // nullable: logs offline podem não ter escola
            timestamp: string;            // campo local
            created_at: string;           // alias â€” preenchido junto com timestamp
            data_criacao?: string;        // campo canônico do servidor
            usuario_email: string;
            acao: string;
            entidade_tipo: string;
            entidade_id: string;
            dados_anteriores: string | null;
            dados_novos: string | null;
            ip_address: string;
            user_agent: string;
            sincronizado: number;         // 0 = pendente | 1 = enviado
        };
        indexes: {
            escola_id: string;
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
        indexes: { escola_id: string; papel: string; ativo: boolean };
    };
    responsaveis: {
        key: string;
        value: ResponsavelLocal;
        indexes: { escola_id: string };
    };
    vinculos_responsavel_aluno: {
        key: string;
        value: VinculoResponsavelAluno;
        indexes: { responsavel_id: string; aluno_matricula: string; escola_id: string };
    };
}

export interface FiltrosAuditoria {
    usuarioEmail?: string;
    acao?: string;
    entidadeTipo?: string;
    dataInicio?: string;
    dataFim?: string;
}

