import { useState, useEffect } from 'react';
import { agenteServico, EstadoAgenteLocal } from '../servicos/agente.servico';

export interface EstadoConexao {
    agente: EstadoAgenteLocal;
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
            const statusAgente = await agenteServico.verificarSaude();
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

        // Polling para o Agente (cada 2 segundos para ser 'instantâneo')
        const intervalo = setInterval(verificarConexao, 2000);

        return () => {
            window.removeEventListener('online', irOnline);
            window.removeEventListener('offline', irOffline);
            clearInterval(intervalo);
        };
    }, []);

    return estado;
}
