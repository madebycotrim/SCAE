/**
 * StatusConexao — indicador online/offline no canto superior do tablet.
 * Puxando a contagem de registros pendentes automaticamente do IndexedDB
 */
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbFluxoLocal } from '../servicos/filaOffline.service';
import { ehDescompassoInaceitavel } from '../servicos/clockDrift.service';
import { usarTenant } from '@tenant/provedorTenant';

export function StatusConexao() {
    const { id: tenantId } = usarTenant();
    const [online, definirOnline] = useState(navigator.onLine);

    // Lê a fila do indexedDB em tempo real (via Dexie Observable)
    const pendentes = useLiveQuery(
        () => dbFluxoLocal.acessosPendentes.where({ tenantId, sincronizado: false }).count(),
        [tenantId]
    ) || 0;

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
        <div className="fixed top-4 right-4 z-40 flex flex-col items-end gap-2">
            <div className={`
                flex items-center gap-2 px-4 py-2 rounded-full
                border backdrop-blur-sm text-xs font-bold uppercase tracking-wider
                transition-all duration-300
                ${online
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }
            `}>
                {online ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{online ? 'ONLINE' : 'OFFLINE'}</span>
                {!online && pendentes > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-rose-500/20 rounded-full text-[10px]">
                        {pendentes} pendente{pendentes > 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {relogioQuebrado && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider shadow-lg">
                    <AlertTriangle size={14} />
                    Relógio do Sistema Incorreto
                </div>
            )}
        </div>
    );
}
