/**
 * Variáveis de ambiente tipadas.
 * Centraliza acesso às env vars da aplicação.
 *
 * Nota: Config Firebase está em compartilhado/servicos/firebase.js
 */

export const AMBIENTE = {
    /** URL base da API backend */
    apiUrl: import.meta.env.VITE_API_URL || '/api',

    /** URL do WebSocket para eventos em tempo real */
    wsUrl: import.meta.env.VITE_WS_URL || '',

    /** Ambiente atual */
    ambiente: import.meta.env.VITE_AMBIENTE || 'development',

    /** Propriedades White Label da plataforma */
    nomeFornecedor: import.meta.env.VITE_NOME_FORNECEDOR ?? 'fornecedora de tecnologia',
    nomeEmpresa: import.meta.env.VITE_NOME_EMPRESA ?? '',

    /** Flags de desenvolvimento */
    ehDesenvolvimento: import.meta.env.DEV,
    ehProducao: import.meta.env.PROD,
} as const;

export type Ambiente = typeof AMBIENTE;
