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
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
                {/* Status da Internet */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`flex items-center gap-3 px-4 py-2 rounded-2xl shadow-lg backdrop-blur-md border ${
                        internet 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                    }`}
                >
                    {internet ? <Globe size={16} /> : <WifiOff size={16} />}
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                        {internet ? 'Nuvem Online' : 'Nuvem Offline'}
                    </span>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${internet ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </motion.div>

                {/* Status do Agente Local */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: 0.1 }}
                    className={`flex items-center gap-3 px-4 py-2 rounded-2xl shadow-lg backdrop-blur-md border ${
                        agente.online 
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' 
                            : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                    }`}
                >
                    <Cpu size={16} />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            {agente.online ? 'Agente Local Ativo' : 'Agente Não Detectado'}
                        </span>
                        {agente.online && agente.nomeEscola && (
                            <span className="text-[8px] opacity-70 truncate max-w-[120px]">
                                {agente.nomeEscola}
                            </span>
                        )}
                    </div>
                    {agente.online && (
                        <div className="w-2 h-2 rounded-full animate-ping bg-blue-500" />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
