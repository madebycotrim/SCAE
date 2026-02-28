/**
 * Cliente de consultas — wrapper sobre @tanstack/react-query.
 *
 * Defaults otimizados para SCAE:
 * - staleTime 5min (dados não mudam entre leituras QR)
 * - retry 2x
 * - refetchOnWindowFocus desativado (tablet fixo)
 */
import { QueryClient } from '@tanstack/react-query';

export const clienteConsulta = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 2,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
        },
        mutations: {
            retry: 1,
        },
    },
});
