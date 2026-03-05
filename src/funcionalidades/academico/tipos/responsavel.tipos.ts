export interface ResponsavelLocal {
    id: string;
    escola_id: string;
    nome_completo: string;
    email: string;
    criado_em?: string;
    atualizado_em?: string;
}

export interface DadosResponsavel extends ResponsavelLocal {
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

