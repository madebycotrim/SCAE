/**
 * Interface representativa de um Aluno no sistema SCAE.
 * @lgpd Base legal: Execução de contrato (Art. 7º, V)
 * @lgpd Finalidade: Identificação e enturmação do aluno
 * @lgpd Retenção: Enquanto durar o vínculo escolar + 5 anos (obrigação fiscal)
 */
export interface Aluno {
    matricula: string;
    nome_completo: string;
    turma_id: string;
    ativo: boolean;
    criado_em: string;
    atualizado_em?: string;
    sincronizado?: number; // 0 para pendente offline, 1 para sincronizado
    email?: string;
    cpf?: string;
    foto_url?: string;
}

/** Interface para Turma (Baseado no IndexedDB) */
export interface TurmaLocal {
    id: string;
    ano_letivo: number;
    serie: string;
    turno: string;
    sala: string;
    professor_regente?: string;
    sincronizado?: number;
}

/** Resultado de operações de importação em lote */
export interface ResultadoImportacao {
    total: number;
    sucessos: number;
    erros: number;
    detalhes: string[];
}

/** Filtros aplicáveis à listagem de alunos */
export interface FiltrosAluno {
    termoBusca?: string;
    turmaId?: string;
    anoLetivo?: string;
}
