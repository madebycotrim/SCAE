/**
 * StatusConexao — indicador online/offline no canto superior do tablet.
 * Puxando a contagem de registros pendentes automaticamente do IndexedDB
 */
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { ehDescompassoInaceitavel } from '../servicos/clockDrift.service';
import { usarEscola } from '@/escola/ProvedorEscola';
import { usarControleAcessoWorker } from '../hooks/usarControleAcessoWorker';

export function StatusConexao() {
    const { id: idEscola } = usarEscola();
    const [online, definirOnline] = useState(navigator.onLine);

    const { statusWorker } = usarControleAcessoWorker();
    const pendentes = statusWorker.pendentes;

    const relogioQuebrado = ehDescompassoInaceitavel();

    useEffect(() => {
        const aoFicarOnline = () => definirOnline(true);
        const aoFicarOffline = () => definirOnline(false);

        window.addEventListener('online', aoFicarOnline);
        window.addEventListener('offline', aoFicarOffline);

        return () => {
            window.removeEventListener('online', aoFicarOnline);
            window.removeEventListener('offline', aoFicarOffline);
        };
    }, []);

    return (
        <div className="fixed top-6 right-8 z-50 flex flex-col items-end gap-2 pointer-events-none">
            {/* Indicador de Conexão Minimalista */}
            <div className={`
                flex items-center gap-3 px-4 py-2 rounded-xl border bg-white/80 backdrop-blur-md shadow-sm
                text-[10px] font-bold uppercase tracking-wider transition-all duration-300
                ${online 
                    ? 'border-slate-200 text-slate-500' 
                    : 'border-rose-200 bg-rose-50 text-rose-600 animate-pulse'}
            `}>
                <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <span>{online ? 'Servidor Conectado' : 'Link Offline'}</span>
                
                {!online && pendentes > 0 && (
                    <span className="ml-2 pl-2 border-l border-rose-200 font-mono text-[9px]">+{pendentes}</span>
                )}
            </div>

            {/* Alerta de Relógio de Forma Simples */}
            {relogioQuebrado && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    <AlertTriangle size={14} />
                    <span>Ajustar Relógio</span>
                </div>
            )}
        </div>
    );
}


