/**
 * Enum de papéis do sistema (RBAC).
 * Papéis ordenados por nível de acesso decrescente.
 */
export const PAPEIS = {
    ADMIN: 'ADMIN',
    COORDENACAO: 'COORDENACAO',
    SECRETARIA: 'SECRETARIA',
    PORTARIA: 'PORTARIA',
    VISUALIZACAO: 'VISUALIZACAO',
};

/**
 * Labels amigáveis para exibição na UI.
 */
export const PAPEIS_LABELS = {
    [PAPEIS.ADMIN]: 'Administrador',
    [PAPEIS.COORDENACAO]: 'Coordenação',
    [PAPEIS.SECRETARIA]: 'Secretaria',
    [PAPEIS.PORTARIA]: 'Portaria',
    [PAPEIS.VISUALIZACAO]: 'Visualização',
};

/**
 * Hierarquia de papéis — maior número = mais permissões.
 */
export const HIERARQUIA_PAPEIS = {
    [PAPEIS.VISUALIZACAO]: 1,
    [PAPEIS.PORTARIA]: 2,
    [PAPEIS.SECRETARIA]: 3,
    [PAPEIS.COORDENACAO]: 4,
    [PAPEIS.ADMIN]: 5,
};

/**
 * Verifica se o papel é de nível igual ou superior ao requerido.
 * @param {string} papelUsuario - Papel do usuário
 * @param {string} papelRequerido - Papel mínimo necessário
 * @returns {boolean}
 */
export function temNivelMinimo(papelUsuario, papelRequerido) {
    return (HIERARQUIA_PAPEIS[papelUsuario] || 0) >= (HIERARQUIA_PAPEIS[papelRequerido] || 0);
}
