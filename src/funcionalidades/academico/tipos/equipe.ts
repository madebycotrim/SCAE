export interface DadosEquipe {
    id: string;
    escola_id: string;
    nome_equipe: string;
    cor: string;
    tts_alias?: string | null;
    totalAlunos?: number;
    totalGrupos?: number;
    criado_em?: string;
    atualizado_em?: string;
}

export interface DadosGrupoEquipe {
    id: string;
    escola_id: string;
    equipe_id: string;
    nome_grupo: string;
    escala_tipo: 'FIXA' | 'ALTERNADA';
    escala_dias: string; // JSON string [1, 2, 3...] para dias da semana ou datas
    totalAlunos?: number;
    criado_em?: string;
    atualizado_em?: string;
}
