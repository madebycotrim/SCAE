/**
 * utilidades-slug.ts - Blindagem de armazenamento por Escola.
 * Garante que dados de diferentes escolas não colidam no mesmo navegador.
 */

export const obterChaveEscola = (chave: string) => {
    const segmentos = window.location.pathname.split('/');
    // O slug costuma ser o primeiro segmento após a raiz (ex: /cem03-taguatinga/...)
    const slug = segmentos[1] || 'global';
    return `scae_${slug}_${chave}`;
};

export const storageEscola = {
    set: (chave: string, valor: any) => {
        const chaveBlindada = obterChaveEscola(chave);
        localStorage.setItem(chaveBlindada, JSON.stringify(valor));
    },
    
    get: <T>(chave: string, fallback: T): T => {
        try {
            const chaveBlindada = obterChaveEscola(chave);
            const dado = localStorage.getItem(chaveBlindada);
            return dado ? JSON.parse(dado) : fallback;
        } catch {
            return fallback;
        }
    },

    remover: (chave: string) => {
        localStorage.removeItem(obterChaveEscola(chave));
    }
};
