import { LucideIcon, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Primitivos de UI Padronizados para o SCAE
 * Design System: Premium, High-Contrast, Professional.
 */

// --- BOTÕES ---

/**
 * Propriedades para o componente de Botão padronizado.
 */
interface BotaoProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Variante visual do botão */
    variante?: 'primario' | 'secundario' | 'perigo' | 'ghost';
    /** Escala de tamanho */
    tamanho?: 'sm' | 'md' | 'lg';
    /** Ícone opcional da biblioteca lucide-react */
    icone?: LucideIcon;
    /** Estado de carregamento que desabilita o botão e exibe um spinner */
    carregando?: boolean;
    /** Se deve ocupar toda a largura do container pai */
    fullWidth?: boolean;
    /** Callback de clique (alternativa ao onClick padrão) */
    aoClicar?: (evento: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Botão universal do sistema com suporte a estados de carregamento e variantes semânticas.
 */
export const Botao: React.FC<BotaoProps> = ({
    children,
    variante = 'primario',
    tamanho = 'md',
    icone: Icone,
    carregando,
    fullWidth,
    aoClicar,
    className = '',
    disabled,
    onClick,
    ...props
}) => {
    const estaCarregando = carregando;
    const cliqueFinal = aoClicar || onClick;

    const estilosBase = "inline-flex items-center justify-center gap-2 font-bold uppercase tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer";

    const variantes = {
        primario: "bg-blue-600 text-white hover:bg-blue-700 border-none focus:ring-blue-600/20",
        secundario: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-100",
        perigo: "bg-white text-rose-500 border border-rose-100 hover:bg-rose-50 hover:border-rose-200 focus:ring-rose-100",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-none px-2 focus:ring-slate-100 shadow-none font-bold"
    };

    const tamanhos = {
        sm: "h-9 px-4 text-[10px] rounded-lg",
        md: "h-10 px-5 text-[11px] rounded-lg",
        lg: "h-11 px-6 text-sm rounded-lg"
    };

    const estiloLargura = fullWidth ? "w-full" : "";

    return (
        <button
            className={`${estilosBase} ${variantes[variante]} ${tamanhos[tamanho]} ${estiloLargura} ${className}`}
            disabled={disabled || estaCarregando}
            aria-busy={estaCarregando}
            onClick={cliqueFinal}
            {...props}
        >
            {estaCarregando ? (
                <Loader2 className="animate-spin" size={tamanho === 'sm' ? 14 : 18} aria-hidden="true" />
            ) : Icone && <Icone size={tamanho === 'sm' ? 14 : 18} aria-hidden="true" />}
            {children}
        </button>
    );
};

// --- CARDS E CONTAINERS ---

export const CartaoConteudo: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>
        {children}
    </div>
);

/**
 * Barra horizontal para filtros e busca.
 */
export const BarraFiltro: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`flex flex-col lg:flex-row lg:items-end gap-6 mb-10 ${className}`}>
        {children}
    </div>
);

// --- METRICAS E INDICADORES ---

/**
 * Propriedades para o Card de Métrica (KPI).
 */
interface CardMetricaProps {
    /** Título da métrica */
    label: string;
    /** Valor principal */
    valor: string | number;
    /** Ícone explicativo */
    icone: LucideIcon;
    /** Texto de apoio pequeno */
    subtitulo?: string;
    /** Percentual de tendência (exibirá seta para cima/baixo) */
    tendencia?: number;
    /** Inverte o significado das cores de tendência (útil para métricas de erro/risco) */
    inverterTendencia?: boolean;
    /** Variação cromática do card (azul, verde, laranja, roxo, indigo) */
    variante?: 'azul' | 'verde' | 'laranja' | 'roxo' | 'indigo' | 'rosa';
    /** Classes extras de estilo */
    className?: string;
}

/**
 * Card informativo para exibição de indicadores chave (KPIs) com suporte a tendências.
 */
export const CardMetrica: React.FC<CardMetricaProps> = ({ 
    label, 
    valor, 
    icone: Icone, 
    subtitulo,
    tendencia,
    inverterTendencia,
    variante = 'azul',
    className = ''
}) => {
    const ehPositivo = tendencia ? (inverterTendencia ? tendencia < 0 : tendencia > 0) : false;

    // Definição explícita para garantir o funcionamento do Tailwind JIT
    const obterEstilo = (v: string) => {
        switch(v) {
            case 'verde': return { texto: 'text-emerald-600', borda: 'border-emerald-200', barra: 'bg-emerald-500', fundo: 'bg-emerald-50' };
            case 'laranja': return { texto: 'text-orange-600', borda: 'border-orange-200', barra: 'bg-orange-500', fundo: 'bg-orange-50' };
            case 'roxo': return { texto: 'text-violet-600', borda: 'border-violet-200', barra: 'bg-violet-500', fundo: 'bg-violet-50' };
            case 'indigo': return { texto: 'text-indigo-600', borda: 'border-indigo-200', barra: 'bg-indigo-500', fundo: 'bg-indigo-50' };
            case 'rosa': return { texto: 'text-rose-600', borda: 'border-rose-200', barra: 'bg-rose-500', fundo: 'bg-rose-50' };
            default: return { texto: 'text-blue-600', borda: 'border-blue-200', barra: 'bg-blue-600', fundo: 'bg-blue-50' };
        }
    };

    const s = obterEstilo(variante);

    return (
        <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300 ${className}`}>
            {/* Barra de cor superior mais presente */}
            <div className={`absolute top-0 left-0 w-full h-[4px] ${s.barra} opacity-10`}></div>
            <div className={`absolute top-0 left-0 w-1/3 h-[4px] ${s.barra} shadow-[0_1px_3px_rgba(0,0,0,0.1)]`}></div>
            
            <div className="flex items-start justify-between">
                <div className={`p-2.5 ${s.fundo} ${s.texto} rounded-xl transition-all group-hover:scale-110 duration-300 shadow-sm border ${s.borda}`}>
                    <Icone size={20} strokeWidth={2.5} />
                </div>
                {tendencia !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${ehPositivo ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {ehPositivo ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(tendencia)}%
                    </div>
                )}
            </div>
            
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{label}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{valor}</h3>
                    {subtitulo && (
                        <span className="text-[10px] text-slate-400 font-medium truncate">{subtitulo.toUpperCase()}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- CARREGAMENTO INTELIGENTE (SKELETONS) ---

/**
 * Placeholder animado para carregamento de conteúdo (Skeleton screen).
 */
export const Esqueleto: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div 
        role="status" 
        aria-label="Carregando conteúdo"
        aria-live="polite"
        className={`animate-pulse bg-slate-100 rounded-2xl ${className} relative overflow-hidden after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent`}
    >
        <span className="sr-only">Carregando...</span>
    </div>
);

/**
 * Overlay de bloqueio para telas de carregamento global.
 */
export const TelaCarregamento: React.FC<{ mensagem?: string }> = ({ mensagem = 'Carregando...' }) => (
    <div className="flex items-center justify-center h-screen w-full bg-slate-50 text-slate-900 fixed inset-0 z-[99999]">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-eletrico" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{mensagem}</span>
        </div>
    </div>
);

// --- INPUTS PADRONIZADOS ---

/**
 * Propriedades para o campo de busca.
 */
interface InputBuscaProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** Ícone opcional lucide-react */
    icone?: LucideIcon;
}

/**
 * Campo de entrada de texto otimizado para buscas e filtros com suporte a ícones.
 */
export const InputBusca: React.FC<InputBuscaProps> = ({ icone: Icone, className = '', ...props }) => (
    <div className="relative flex-1 group">
        {Icone && <Icone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors" size={14} aria-hidden="true" />}
        <input
            className={`w-full ${Icone ? 'pl-11' : 'pl-5'} pr-5 h-10 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 rounded-xl text-xs font-medium outline-none transition-all placeholder:text-slate-400 text-slate-900 ${className}`}
            {...props}
        />
    </div>
);
