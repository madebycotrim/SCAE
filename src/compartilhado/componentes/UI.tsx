import { LucideIcon, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

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

    const baseStyles = "inline-flex items-center justify-center gap-2 font-bold uppercase tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer";

    const variantes = {
        primario: "bg-[#0F172A] text-white hover:bg-[#1E293B] border border-slate-800 shadow-[0_10px_20px_-5px_rgba(15,23,42,0.3)] shadow-indigo-500/5 focus:ring-slate-400",
        secundario: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm focus:ring-slate-400",
        perigo: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 focus:ring-rose-500",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 border-none px-2 focus:ring-slate-400 shadow-none font-black"
    };

    const tamanhos = {
        sm: "h-8 px-3 text-[10px] tracking-widest rounded-2xl",
        md: "h-11 px-4 text-[11px] rounded-2xl", // Aumentado de h-9 para h-11 para alinhar com input
        lg: "h-12 px-6 text-sm rounded-2xl"
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
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] overflow-hidden ${className}`}>
        {children}
    </div>
);

export const BarraFiltro: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white/80 backdrop-blur-xl p-3 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col lg:flex-row lg:items-center gap-4 sticky top-4 z-20 ${className}`}>
        {children}
    </div>
);

// --- CARREGAMENTO INTELIGENTE (SKELETONS) ---

export const Esqueleto: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-100 rounded-2xl ${className} relative overflow-hidden after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent`}></div>
);

export const BarraProgressoGlobal: React.FC<{ ativa: boolean }> = ({ ativa }) => {
    const [progresso, definirProgresso] = useState(0);

    useEffect(() => {
        let interval: any;
        if (ativa) {
            definirProgresso(10);
            interval = setInterval(() => {
                definirProgresso(prev => (prev >= 90 ? 90 : prev + Math.random() * 5));
            }, 400);
        } else {
            definirProgresso(100);
            setTimeout(() => definirProgresso(0), 500);
        }
        return () => clearInterval(interval);
    }, [ativa]);

    if (progresso === 0) return null;

    return (
        <div 
            className="fixed top-0 left-0 h-0.5 bg-indigo-600 z-[9999] transition-all duration-300 ease-out" 
            style={{ width: `${progresso}%`, boxShadow: '0 0 10px rgba(79, 70, 229, 0.5)' }}
        />
    );
};

// --- INPUTS PADRONIZADOS ---

interface InputBuscaProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icone?: LucideIcon;
}

export const InputBusca: React.FC<InputBuscaProps> = ({ icone: Icone, className = '', ...props }) => (
    <div className="relative flex-1 group">
        {Icone && <Icone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} />}
        <input
            className={`w-full ${Icone ? 'pl-11' : 'pl-5'} pr-5 h-11 bg-slate-50 border border-slate-100 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 rounded-2xl text-xs font-bold outline-none transition-all placeholder:text-slate-400 text-slate-900 ${className}`}
            {...props}
        />
    </div>
);
