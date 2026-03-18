/**
 * Enum de papéis do sistema (RBAC).
 * Papéis ordenados por nível de acesso decrescente.
 */
export const PAPEIS = {
    CENTRAL: 'CENTRAL',
    ADMIN: 'ADMIN',
    COORDENACAO: 'COORDENACAO',
    SECRETARIA: 'SECRETARIA',
    PORTEIRO: 'PORTEIRO',
    VISUALIZACAO: 'VISUALIZACAO',
};

/**
 * Labels amigáveis para exibição na UI.
 */
export const PAPEIS_LABELS = {
    [PAPEIS.CENTRAL]: 'Gestão Central',
    [PAPEIS.ADMIN]: 'Administrador',
    [PAPEIS.COORDENACAO]: 'Coordenação',
    [PAPEIS.SECRETARIA]: 'Secretaria',
    [PAPEIS.PORTEIRO]: 'Controle de Acesso',
    [PAPEIS.VISUALIZACAO]: 'Visualização',
};

/**
 * Hierarquia de papéis — maior número = mais permissões.
 */
export const HIERARQUIA_PAPEIS = {
    [PAPEIS.VISUALIZACAO]: 1,
    [PAPEIS.PORTEIRO]: 2,
    [PAPEIS.SECRETARIA]: 3,
    [PAPEIS.COORDENACAO]: 4,
    [PAPEIS.ADMIN]: 5,
    [PAPEIS.CENTRAL]: 6,
};

/**
 * Verifica se o papel é de nível igual ou superior ao requerido.
 * @param {string} papelUsuario - Papel do usuário
 * @param {string} papelRequerido - Papel mínimo necessário
 * @returns {boolean}
 */
export function temNivelMinimo(papelUsuario: string, papelRequerido: string) {
    const nivelUsuario = (HIERARQUIA_PAPEIS as any)[papelUsuario] || 0;
    const nivelRequerido = (HIERARQUIA_PAPEIS as any)[papelRequerido] || 0;
    return nivelUsuario >= nivelRequerido;
}

