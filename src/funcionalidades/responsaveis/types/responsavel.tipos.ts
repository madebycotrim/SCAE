/**
 * Tipos do módulo de responsáveis.
 */

export type StatusVinculo = 'AGUARDANDO' | 'PROCESSANDO' | 'VINCULADO' | 'ERRO';

export interface Responsavel {
    id: string;
    nome: string;
    telefone: string;
    email?: string;
    /** Token do Firebase Cloud Messaging para Push Notifications (Fase 6) */
    fcmToken?: string;
    /** IDs dos alunos vinculados */
    alunosVinculados: string[];
}

export interface VinculoAluno {
    /** Código gerado pela escola, entregue ao responsável */
    codigoAluno: string;
    nomeResponsavel: string;
    telefone: string;
    /** 
     * Capturado localmente via Notification.requestPermission()
     * para atrelar o aparelho pessoal do pai/mãe ao D1. 
     */
    fcmToken?: string | null;
}

export const STATUS_VINCULO = {
    AGUARDANDO: 'AGUARDANDO',
    PROCESSANDO: 'PROCESSANDO',
    VINCULADO: 'VINCULADO',
    ERRO: 'ERRO',
} as const;
