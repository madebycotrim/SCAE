import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Lock, WifiOff, CheckCircle2, ShieldAlert } from 'lucide-react';
import { servicoAgente, type StatusAgente } from '@/compartilhado/servicos/servicoAgente';
import toast from 'react-hot-toast';

export function AgenteStatusBadge() {
    const [status, setStatus] = useState<StatusAgente & { carregando: boolean }>({ 
        online: false, 
        erroPin: false,
        carregando: true 
    });
    const [mostrandoInput, setMostrandoInput] = useState(false);
    const [pinInput, setPinInput] = useState('');

    const verificarStatus = async () => {
        const resultado = await servicoAgente.ping();
        // @ts-ignore - injetando estado de erro de PIN se necessário
        setStatus({ ...resultado, carregando: false });
    };

    useEffect(() => {
        verificarStatus();
        const interval = setInterval(verificarStatus, 10000); // Verifica a cada 10s
        return () => clearInterval(interval);
    }, []);

    const salvarPin = () => {
        if (!pinInput) return;
        servicoAgente.definirPin(pinInput);
        setMostrandoInput(false);
        setPinInput('');
        toast.success('PIN do Agente atualizado!');
        verificarStatus();
    };

    // Detecta se o erro é de PIN (Não Autorizado)
    // O servicoAgente.ts retorna online: false se falhar o fetchAgente
    // MAS eu vou ajustar o servicoAgente.ts para me dizer se é erro de PIN especificamente.

    return (
        <div className="flex items-center gap-2">
            <div 
                onClick={() => setMostrandoInput(!mostrandoInput)}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all cursor-pointer group
                    ${status.online 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' 
                        : status.erroPin
                            ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                            : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
                    }
                `}
            >
                {status.online || status.erroPin ? (
                    <Radar size={14} className={status.online ? 'animate-pulse' : ''} />
                ) : (
                    <WifiOff size={14} />
                )}
                
                <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-tighter leading-none mb-0.5">Agente Local</span>
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                        {status.online ? 'Conectado' : status.erroPin ? 'Requer PIN' : 'Offline'}
                    </span>
                </div>

                <AnimatePresence>
                    {status.online && (
                        <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            className="bg-white rounded-full p-0.5 shadow-sm"
                        >
                            <CheckCircle2 size={10} className="text-emerald-500" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {mostrandoInput && (
                    <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-lg z-50"
                    >
                        <input 
                            type="password"
                            placeholder="PIN do Agente"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            className="text-[10px] font-black uppercase tracking-widest px-3 py-1 outline-none w-28"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && salvarPin()}
                        />
                        <button 
                            onClick={salvarPin}
                            className="p-1 px-2 bg-slate-900 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                            <Lock size={12} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
