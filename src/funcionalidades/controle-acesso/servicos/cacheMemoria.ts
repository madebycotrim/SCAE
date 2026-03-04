/**
 * Módulo de Caching em memória do Controle de Acesso, rodando O(1) Set/Map sem dependências de Promise nem I/O.
 */
import { AlunoLocal } from '@compartilhado/types/bancoLocal.tipos';

export interface DadosAluno extends AlunoLocal { }

export interface CacheControleAcesso {
    alunosAtivos: Map<string, DadosAluno>;  // matricula â†’ dados (lookup O(1) memory)
    qrsRevogados: Set<string>;              // set de matrículas revogadas (O(1))
    ultimaAtualizacao: number;
}

export const cacheMemoria: CacheControleAcesso = {
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

