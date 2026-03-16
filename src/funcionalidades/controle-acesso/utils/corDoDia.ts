/**
 * Utilitário para gerar de forma determinística a "Cor do Dia" de segurança.
 * A mesma cor deve aparecer em todos os dispositivos da mesma escola na mesma data.
 */
export function obterCorDoDia(escolaId: string): string {
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const seed = `${escolaId}-${hoje}`;
    
    // Hash simples para gerar a semente
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Paleta de cores de alta visibilidade e contraste (SCAE Safety Palette)
    const paleta = [
        '#22c55e', // Verde Esmeralda
        '#ef4444', // Vermelho Rubi
        '#eab308', // Amarelo Âmbar
        '#3b82f6', // Azul Royal
        '#a855f7', // Roxo Vibrante
        '#f97316', // Laranja Neon
        '#06b6d4', // Ciano
        '#ec4899', // Rosa Choque
    ];
    
    return paleta[Math.abs(hash) % paleta.length];
}
