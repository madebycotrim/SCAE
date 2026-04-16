import { useState, useEffect } from 'react';
import { servicoAgente, StatusAgente } from '../servicos/servicoAgente';

export interface EstadoConexao {
    agente: StatusAgente;
    internet: boolean;
    carregando: boolean;
}

/**
 * Hook para monitorar o estado de conectividade híbrida (Agente Local e Internet).
 */
export function usarStatusConexao() {
    const [estado, setEstado] = useState<EstadoConexao>({
        agente: { online: false },
        internet: navigator.onLine,
        carregando: true
    });

    useEffect(() => {
        const verificarConexao = async () => {
            const statusAgente = await servicoAgente.ping();
            setEstado({
                agente: statusAgente,
                internet: navigator.onLine,
                carregando: false
            });
        };

        verificarConexao();

        // Monitorar internet nativa
        const irOnline = () => setEstado(prev => ({ ...prev, internet: true }));
        const irOffline = () => setEstado(prev => ({ ...prev, internet: false }));

        window.addEventListener('online', irOnline);
        window.addEventListener('offline', irOffline);

        // Polling para o Agente (cada 10 segundos)
        const intervalo = setInterval(verificarConexao, 10000);

        return () => {
            window.removeEventListener('online', irOnline);
            window.removeEventListener('offline', irOffline);
            clearInterval(intervalo);
        };
    }, []);

    return estado;
}
