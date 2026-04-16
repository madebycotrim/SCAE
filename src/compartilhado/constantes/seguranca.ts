/**
 * Constantes de segurança global do sistema SCAE/Catraki.
 */

/** Email do desenvolvedor master com acesso root a tudo */
export const EMAIL_RAIZ = 'madebycotrim@gmail.com';

/** Papeis oficiais do sistema */
export const PAPEIS = {
    CENTRAL: 'CENTRAL',
    ADMIN: 'ADMIN',
    COORDENACAO: 'COORDENACAO',
    SECRETARIA: 'SECRETARIA',
    PORTEIRO: 'PORTEIRO',
    VISUALIZACAO: 'VISUALIZACAO'
} as const;

export type PapelUsuario = keyof typeof PAPEIS;
