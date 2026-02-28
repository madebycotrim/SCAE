/**
 * Módulo de Caching em memória do Portaria, rodando O(1) Set/Map sem dependências de Promise nem I/O.
 */

export interface DadosAluno {
    matricula: string;
    nome_completo: string;
    turma_id: string;
}

export interface CachePortaria {
    alunosAtivos: Map<string, DadosAluno>;  // matricula → dados (lookup O(1) memory)
    qrsRevogados: Set<string>;              // set de matrículas revogadas (O(1))
    ultimaAtualizacao: number;
}

export const cacheMemoria: CachePortaria = {
    alunosAtivos: new Map(),
    qrsRevogados: new Set(),
    ultimaAtualizacao: 0
};

export function alunoEstaRevogado(matricula: string): boolean {
    return cacheMemoria.qrsRevogados.has(matricula);
}

export function buscarAlunoEmCache(matricula: string): DadosAluno | undefined {
    return cacheMemoria.alunosAtivos.get(matricula);
}

export function atualizarListaAlunosCache(lista: DadosAluno[]) {
    cacheMemoria.alunosAtivos.clear();
    lista.forEach(al => cacheMemoria.alunosAtivos.set(al.matricula, al));
    cacheMemoria.ultimaAtualizacao = Date.now();
}

export function atualizarRevogacoesCache(matriculasRevogadas: string[]) {
    cacheMemoria.qrsRevogados.clear();
    matriculasRevogadas.forEach(matricula => cacheMemoria.qrsRevogados.add(matricula));
}
