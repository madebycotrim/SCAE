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

    const estilosBase = "inline-flex items-center justify-center gap-2 font-bold uppercase tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer";

    const variantes = {
        primario: "bg-eletrico text-white hover:brightness-110 border-none shadow-premium focus:ring-eletrico/30",
        secundario: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-400",
        perigo: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 focus:ring-rose-500",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 border-none px-2 focus:ring-slate-400 shadow-none font-black"
    };

    const tamanhos = {
        sm: "h-8 px-3 text-[10px] tracking-widest rounded-2xl",
        md: "h-11 px-4 text-[11px] rounded-2xl",
        lg: "h-12 px-6 text-sm rounded-2xl"
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

/**
 * Container básico com bordas arredondadas e sombra suave.
 */
export const CartaoConteudo: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

/**
 * Barra horizontal para filtros e busca, fixa no topo durante o scroll.
 */
export const BarraFiltro: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white/80 backdrop-blur-xl p-3 rounded-2xl border border-slate-200 mb-8 flex flex-col lg:flex-row lg:items-end gap-4 sticky top-4 z-20 ${className}`}>
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
    /** Cor de fundo do ring do ícone */
    bg?: string;
    /** Cor do texto/ícone dentro do ring */
    text?: string;
    /** Cor da borda do ring do ícone */
    border?: string;
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
    bg = 'bg-slate-50', 
    text = 'text-slate-600', 
    border = 'border-slate-100',
    className = ''
}) => {
    const ehPositivo = tendencia ? (inverterTendencia ? tendencia < 0 : tendencia > 0) : false;

    return (
        <div className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 group transition-all hover:shadow-md ${className}`}>
            {/* Container do Ícone */}
            <div className={`w-14 h-14 rounded-2xl ${bg} ${text} flex items-center justify-center shrink-0 border-2 ${border} shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                <Icone size={26} strokeWidth={2.5} />
            </div>

            {/* Conteúdo Informativo */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none truncate">{label}</span>
                    {tendencia !== undefined && (
                        <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] font-black shrink-0 ${ehPositivo ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {ehPositivo ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {Math.abs(tendencia)}%
                        </div>
                    )}
                </div>
                <div className="flex items-baseline gap-2 overflow-hidden">
                    <span className="text-xl font-black text-slate-900 leading-none truncate">{valor}</span>
                    {subtitulo && (
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter truncate">{subtitulo}</span>
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
        {Icone && <Icone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} aria-hidden="true" />}
        <input
            className={`w-full ${Icone ? 'pl-11' : 'pl-5'} pr-5 h-11 bg-slate-50 border border-slate-100 focus:bg-white focus:border-eletrico focus:ring-4 focus:ring-eletrico/5 rounded-2xl text-xs font-bold outline-none transition-all placeholder:text-slate-400 text-slate-900 ${className}`}
            {...props}
        />
    </div>
);
