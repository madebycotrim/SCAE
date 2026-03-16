/**
 * Tipos para o módulo de Responsáveis (LGPD).
 * Centralizado no servidor (D1).
 */

export interface Responsavel {
    id: string;
    escola_id: string;
    nome_completo: string;
    email: string;
    criado_em?: string;
    atualizado_em?: string;
}

export interface DadosResponsavel extends Responsavel {
    alunos?: string[]; // Lista de matrículas vinculadas
}

export interface RespostaResponsavel {
    dados: DadosResponsavel;
    mensagem?: string;
}

export interface RespostaListaResponsaveis {
    dados: DadosResponsavel[];
    total: number;
    pagina: number;
    porPagina: number;
}
