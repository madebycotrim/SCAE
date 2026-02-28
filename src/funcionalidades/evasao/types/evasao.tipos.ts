/**
 * Tipagens atreladas ao retorno do endpoint de Evasão (Motor de Faltas).
 */
export type StatusEvasao = 'PENDENTE' | 'EM_ANALISE' | 'RESOLVIDO';

export interface AlertaEvasao {
    id: string;
    aluno_matricula: string;
    aluno_nome: string | null;
    turma_nome: string | null;
    motivo: string;
    status: StatusEvasao;
    data_criacao: string;
    data_resolucao: string | null;
}
