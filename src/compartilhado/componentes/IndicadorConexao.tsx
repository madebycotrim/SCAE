import { motion, AnimatePresence } from 'framer-motion';
import { usarStatusConexao } from '@/compartilhado/hooks/usarStatusConexao';
import { Activity, Globe, Wifi, WifiOff, Cpu } from 'lucide-react';

/**
 * Componente IndicadorConexao
 * Exibe o status da saúde do sistema (Internet + Agente Local) com estética premium.
 */
export function IndicadorConexao() {
    const { agente, internet, carregando } = usarStatusConexao();

    if (carregando) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity duration-300 pointer-events-auto cursor-help bg-white/50 dark:bg-black/20 backdrop-blur-sm p-1.5 px-3 rounded-full border border-black/5 dark:border-white/5">
            <AnimatePresence mode="popLayout">
                {/* Status da Internet */}
                <motion.div
                    key="status-internet"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5"
                    title={internet ? 'Nuvem Online' : 'Nuvem Offline'}
                >
                    <Globe size={12} className={internet ? 'text-emerald-500' : 'text-rose-500'} />
                    <div className={`w-1.5 h-1.5 rounded-full ${internet ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </motion.div>

                <div key="divisor" className="w-[1px] h-3 bg-black/10 dark:bg-white/10 mx-1" />

                {/* Status do Agente Local */}
                <motion.div
                    key="status-agente"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5"
                    title={agente.online ? `Agente Local Ativo: ${agente.nomeEscola || 'SCAE'}` : 'Agente Não Detectado'}
                >
                    <Cpu size={12} className={agente.online ? 'text-blue-500' : 'text-slate-400'} />
                    <div className={`w-1.5 h-1.5 rounded-full ${agente.online ? 'bg-blue-500' : 'bg-slate-400'}`} />
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
