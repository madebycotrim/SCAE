import React from 'react';
import toast, { Toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    CheckCircle2, 
    AlertCircle, 
    Info, 
    AlertTriangle,
    Bell
} from 'lucide-react';

interface NotificacaoPremiumProps {
    t: Toast;
    titulo: string;
    mensagem?: string;
    tipo?: 'info' | 'success' | 'warning' | 'error';
}

/**
 * NotificacaoPremium — Componente de Toast customizado com design High-End.
 * Segue os princípios de design do SCAE: Premium, Outlined, High-Contrast.
 */
export const NotificacaoPremium = ({ t, titulo, mensagem, tipo = 'info' }: NotificacaoPremiumProps) => {
    const icones = {
        success: <CheckCircle2 size={18} className="text-emerald-500" />,
        error: <AlertCircle size={18} className="text-rose-500" />,
        warning: <AlertTriangle size={18} className="text-amber-500" />,
        info: <Info size={18} className="text-indigo-500" />
    };

    const coresFundo = {
        success: 'border-l-emerald-500',
        error: 'border-l-rose-500',
        warning: 'border-l-amber-500',
        info: 'border-l-indigo-500'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
                max-w-sm w-full bg-white border border-slate-200 border-l-4 ${coresFundo[tipo]}
                shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-4 flex gap-3 pointer-events-auto
                backdrop-blur-xl bg-white/95
            `}
        >
            <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100`}>
                {icones[tipo]}
            </div>
            
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider mb-0.5">
                    {titulo}
                </p>
                {mensagem && (
                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
                        {mensagem}
                    </p>
                )}
            </div>

            <button
                onClick={() => toast.dismiss(t.id)}
                className="shrink-0 p-1.5 hover:bg-slate-100 rounded-lg text-slate-300 hover:text-slate-600 transition-colors h-fit"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
};

/**
 * Atalho para disparar a notificação premium
 */
export const dispararToast = (titulo: string, mensagem?: string, tipo: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    toast.custom((t) => (
        <NotificacaoPremium t={t} titulo={titulo} mensagem={mensagem} tipo={tipo} />
    ), {
        duration: 4000,
        position: 'top-right',
    });
};
