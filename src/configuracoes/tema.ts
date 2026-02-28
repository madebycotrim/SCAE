/**
 * Tokens de design base — podem ser sobrescritos pelo tenant.
 * Valores padrão usados quando o tenant não define tema.
 */
export interface DefTemaBase {
    cores: Record<string, string>;
    fontes: Record<string, string>;
    raios: Record<string, string>;
    sombras: Record<string, string>;
}

export const TEMA_BASE: DefTemaBase = {
    cores: {
        primaria: '#6366f1',
        secundaria: '#4f46e5',
        acento: '#818cf8',
        fundo: '#f8fafc',
        texto: '#0f172a',
        borda: '#e2e8f0',
    },
    fontes: {
        base: "'Outfit', sans-serif",
        mono: "'JetBrains Mono', monospace",
    },
    raios: {
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
    },
    sombras: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    },
};
