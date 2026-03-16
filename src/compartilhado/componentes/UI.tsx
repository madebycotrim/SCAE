import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

/**
 * Primitivos de UI Padronizados para o SCAE
 * Design System: Premium, High-Contrast, Professional.
 */

// --- BOTÕES ---

interface BotaoProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variante?: 'primario' | 'secundario' | 'perigo' | 'ghost';
    tamanho?: 'sm' | 'md' | 'lg';
    icone?: LucideIcon;
    loading?: boolean;
    carregando?: boolean; // Alias para compatibilidade
    fullWidth?: boolean;
}

export const Botao: React.FC<BotaoProps> = ({
    children,
    variante = 'primario',
    tamanho = 'md',
    icone: Icone,
    loading,
    carregando,
    fullWidth,
    className = '',
    disabled,
    ...props
}) => {
    const estaCarregando = loading || carregando;

    const baseStyles = "inline-flex items-center justify-center gap-2 font-bold uppercase tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 outline-none focus:ring-2 focus:ring-offset-2";

    const variantes = {
        primario: "bg-slate-900 text-white hover:bg-black border border-slate-900 focus:ring-slate-400",
        secundario: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-400",
        perigo: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 focus:ring-rose-500",
        ghost: "bg-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-none px-2 focus:ring-slate-400 shadow-none"
    };

    const tamanhos = {
        sm: "h-8 px-3 text-[10px] tracking-widest rounded-lg",
        md: "h-9 px-4 text-[11px] rounded-lg",
        lg: "h-11 px-6 text-sm rounded-xl"
    };

    const widthStyle = fullWidth ? "w-full" : "";

    return (
        <button
            className={`${baseStyles} ${variantes[variante]} ${tamanhos[tamanho]} ${widthStyle} ${className}`}
            disabled={disabled || estaCarregando}
            {...props}
        >
            {estaCarregando ? (
                <Loader2 className="animate-spin" size={tamanho === 'sm' ? 14 : 18} />
            ) : Icone && <Icone size={tamanho === 'sm' ? 14 : 18} />}
            {children}
        </button>
    );
};

// --- CARDS E CONTAINERS ---

export const CartaoConteudo: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-slate-900/70 rounded-xl border border-slate-700/80 shadow-media overflow-hidden ${className}`}>
        {children}
    </div>
);

export const BarraFiltro: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-slate-900/70 p-3 rounded-xl border border-slate-700/80 shadow-media mb-6 flex flex-col lg:flex-row lg:items-center gap-4 sticky top-4 z-20 ${className}`}>
        {children}
    </div>
);

// --- INPUTS PADRONIZADOS ---

interface InputBuscaProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icone?: LucideIcon;
}

export const InputBusca: React.FC<InputBuscaProps> = ({ icone: Icone, className = '', ...props }) => (
    <div className="relative flex-1 group">
        {Icone && <Icone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-400 transition-colors" size={16} />}
        <input
            className={`w-full ${Icone ? 'pl-10' : 'pl-4'} pr-4 h-9 bg-slate-900/50 border border-slate-700 focus:bg-slate-900 focus:border-slate-600 focus:ring-4 focus:ring-slate-400/30 rounded-lg text-sm outline-none transition-all placeholder:text-slate-400 text-slate-200 ${className}`}
            {...props}
        />
    </div>
);
