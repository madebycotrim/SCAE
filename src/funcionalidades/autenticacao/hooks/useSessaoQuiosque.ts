/**
 * Hook para monitorar e renovar a sessão do tablet quiosque.
 * Renova o token Firebase a cada 50 minutos (tokens expiram em 60min).
 */
import { useState, useEffect, useCallback } from 'react';
import { sessaoQuiosque } from '../servicos/sessaoQuiosque.service';

const INTERVALO_RENOVACAO_MS = 50 * 60 * 1000; // 50 minutos

interface RetornoSessaoQuiosque {
    sessaoAtiva: boolean;
    ultimaRenovacao: string | null;
    renovar: () => Promise<void>;
}

export function useSessaoQuiosque(): RetornoSessaoQuiosque {
    const [sessaoAtiva, definirSessaoAtiva] = useState(false);
    const [ultimaRenovacao, definirUltimaRenovacao] = useState<string | null>(null);

    const renovar = useCallback(async () => {
        try {
            const token = await sessaoQuiosque.renovarToken();
            if (token) {
                definirSessaoAtiva(true);
                definirUltimaRenovacao(new Date().toISOString());
            } else {
                definirSessaoAtiva(false);
            }
        } catch {
            definirSessaoAtiva(false);
        }
    }, []);

    useEffect(() => {
        definirSessaoAtiva(sessaoQuiosque.verificarSessaoAtiva());
        const intervalo = setInterval(renovar, INTERVALO_RENOVACAO_MS);
        return () => clearInterval(intervalo);
    }, [renovar]);

    return { sessaoAtiva, ultimaRenovacao, renovar };
}
