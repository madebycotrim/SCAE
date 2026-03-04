/**
 * Resolve o escola com base no slug na URL.
 * Formato: seuapp.com/:slugEscola/dashboard
 * Ex: seuapp.com/escola-abc â†’ slug = "escola-abc"
 *
 * Em desenvolvimento local: localhost:5173/escola-abc/painel
 */
export function resolverSlugDaUrl() {
    const segmentos = window.location.pathname.split('/');
    // Primeiro segmento não vazio após a barra
    return segmentos.find(s => s.length > 0) ?? '';
}

/**
 * Constrói a URL da API para um escola específico.
 * @param {string} slug - Identificador da escola
 * @returns {string} URL completa da API de escola
 */
export function construirUrlEscola(slug) {
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    return `${baseUrl}/escola/${slug}`;
}

