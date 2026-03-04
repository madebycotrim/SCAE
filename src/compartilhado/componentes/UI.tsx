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
        primario: "bg-slate-900 text-white hover:bg-black border border-slate-900 focus:ring-slate-500",
        secundario: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-400",
        perigo: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 focus:ring-rose-500",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-none px-2 focus:ring-slate-400 shadow-none"
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
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

export const BarraFiltro: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center gap-4 sticky top-4 z-20 ${className}`}>
        {children}
    </div>
);

// --- INPUTS PADRONIZADOS ---

interface InputBuscaProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icone?: LucideIcon;
}

export const InputBusca: React.FC<InputBuscaProps> = ({ icone: Icone, className = '', ...props }) => (
    <div className="relative flex-1 group">
        {Icone && <Icone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} />}
        <input
            className={`w-full ${Icone ? 'pl-10' : 'pl-4'} pr-4 h-9 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 rounded-lg text-sm outline-none transition-all placeholder:text-slate-400 ${className}`}
            {...props}
        />
    </div>
);
