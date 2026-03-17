export type TipoAcesso = 'ENTRADA' | 'SAIDA';

export const TIPO_ACESSO = {
    ENTRADA: 'ENTRADA' as TipoAcesso,
    SAIDA: 'SAIDA' as TipoAcesso,
    INDEFINIDO: 'INDEFINIDO'
} as const;
