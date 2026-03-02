/**
 * Temas por escola — configuração visual por tenant.
 * Cada escola pode sobrescrever cores, fontes e logo.
 *
 * Em produção, estes dados viriam da API.
 * Este arquivo serve como fallback/referência.
 */

export const TEMAS_PADRAO = {
    'cem03-taguatinga': {
        corPrimaria: '#6366f1',
        corSecundaria: '#4f46e5',
        corAcento: '#818cf8',
        fonteBase: 'Outfit, sans-serif',
        raio: '1rem',
        nomeExibicao: 'CEM 03 de Taguatinga',
    },
};

/**
 * Aplica o tema de uma escola ao documento.
 * @param {object} tema - Objeto com variáveis CSS do tema
 */
export function aplicarTema(tema) {
    const raiz = document.documentElement;
    if (tema.corPrimaria) raiz.style.setProperty('--cor-primaria', tema.corPrimaria);
    if (tema.corSecundaria) raiz.style.setProperty('--cor-secundaria', tema.corSecundaria);
    if (tema.corAcento) raiz.style.setProperty('--cor-acento', tema.corAcento);
    if (tema.fonteBase) raiz.style.setProperty('--fonte-base', tema.fonteBase);
}
