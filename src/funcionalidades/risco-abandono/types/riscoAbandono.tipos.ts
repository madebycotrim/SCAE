/**
 * Tipagens atreladas ao retorno do endpoint de Risco de Abandono (Motor de Faltas).
 */
export type StatusRiscoAbandono = 'PENDENTE' | 'EM_ANALISE' | 'RESOLVIDO';

export interface AlertaRiscoAbandono {
    id: string;
    aluno_matricula: string;
    aluno_nome: string | null;
    turma_nome: string | null;
    motivo: string;
    status: StatusRiscoAbandono;
    data_criacao: string;
    data_resolucao: string | null;
}
