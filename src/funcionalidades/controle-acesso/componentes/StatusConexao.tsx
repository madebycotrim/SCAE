import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { ehDescompassoInaceitavel } from '../servicos/clockDrift.service';
import { usarEscola } from '@/escola/ProvedorEscola';
import { usarControleAcessoWorker } from '../hooks/usarControleAcessoWorker';

/**
 * Indicador de status de conectividade (online/offline) e sincronização.
 * Exibe contagem de registros pendentes e alertas de hardware (relógio).
 */
export function StatusConexao() {
    const { id: idEscola } = usarEscola();
    const [estaOnline, setEstaOnline] = useState(navigator.onLine);

    const { statusWorker } = usarControleAcessoWorker();
    const totalPendentes = statusWorker.pendentes;

    const relogioDesajustado = ehDescompassoInaceitavel();

    useEffect(() => {
        const aoFicarOnline = () => setEstaOnline(true);
        const aoFicarOffline = () => setEstaOnline(false);

        window.addEventListener('online', aoFicarOnline);
        window.addEventListener('offline', aoFicarOffline);

        return () => {
            window.removeEventListener('online', aoFicarOnline);
            window.removeEventListener('offline', aoFicarOffline);
        };
    }, []);

    if (estaOnline && totalPendentes === 0 && !relogioDesajustado) return null;

    return (
        <div className="fixed top-6 right-8 z-50 flex flex-col items-end gap-2 pointer-events-none">
            {/* Indicador de Falha ou Pendência */}
            {(!estaOnline || totalPendentes > 0) && (
                <div className={`
                    flex items-center gap-3 px-4 py-2 rounded-2xl border bg-white/80 backdrop-blur-md shadow-sm
                    text-[10px] font-bold uppercase tracking-wider transition-all duration-300
                    ${estaOnline ? 'border-slate-200 text-slate-500' : 'border-rose-200 bg-rose-50 text-rose-600 animate-pulse'}
                `}>
                    <div className={`w-1.5 h-1.5 rounded-full ${estaOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    <span>{estaOnline ? `${totalPendentes} Pendente(s)` : 'Link Offline'}</span>
                </div>
            )}

            {/* Alerta de Relógio */}
            {relogioDesajustado && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    <AlertTriangle size={14} />
                    <span>Ajustar Relógio</span>
                </div>
            )}
        </div>
    );
}


