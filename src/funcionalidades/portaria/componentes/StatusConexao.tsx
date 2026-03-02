/**
 * StatusConexao — indicador online/offline no canto superior do tablet.
 * Puxando a contagem de registros pendentes automaticamente do IndexedDB
 */
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { ehDescompassoInaceitavel } from '../servicos/clockDrift.service';
import { usarTenant } from '@tenant/provedorTenant';
import { usarPortariaWorker } from '../hooks/usarPortariaWorker';

export function StatusConexao() {
    const { id: tenantId } = usarTenant();
    const [online, definirOnline] = useState(navigator.onLine);

    const { statusWorker } = usarPortariaWorker();
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
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
            <div className={`
                flex items-center gap-2 px-4 py-2 rounded-lg border bg-white shadow-sm
                text-xs font-semibold transition-colors duration-300
                ${online ? 'border-emerald-200 text-emerald-700' : 'border-rose-200 text-rose-700'}
            `}>
                <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                {online ? <Wifi size={14} className="text-emerald-600" /> : <WifiOff size={14} className="text-rose-600" />}
                <span>{online ? 'Online' : 'Offline'}</span>
                {!online && pendentes > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-rose-50 rounded text-[10px] text-rose-600 font-bold border border-rose-100">
                        {pendentes} pendentes
                    </span>
                )}
            </div>

            {relogioQuebrado && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-rose-200 text-rose-700 text-xs font-semibold shadow-sm animate-pulse">
                    <AlertTriangle size={14} className="text-rose-600" />
                    Relógio Desincronizado
                </div>
            )}
        </div>
    );
}

