import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook genérico para consulta de dados com suporte a recarregamento.
 * @param chaves - Array de dependências/chaves para a consulta (estilo react-query)
 * @param buscar - Função assíncrona que retorna os dados
 * @param opcoes - Opções extras (staleTime, etc - Reservado para compatibilidade)
 */
export function usarConsulta<T = any>(
    chaves: unknown[],
    buscar: () => Promise<T>,
    opcoes?: { staleTime?: number; refetchInterval?: number }
) {
    const [dados, definirDados] = useState<T | null>(null);
    const [carregando, definirCarregando] = useState(true);
    const [erro, definirErro] = useState<Error | null>(null);

    // Usar uma ref para garantir que não busquemos dados obsoletos se o componente desmontar
    const montado = useRef(true);

    const carregar = useCallback(async () => {
        // Se já tivermos dados e houver staleTime, poderíamos pular, 
        // mas aqui mantemos simples para compatibilidade.
        try {
            const resultado = await buscar();
            if (montado.current) {
                definirDados(resultado);
                definirErro(null);
            }
        } catch (e) {
            if (montado.current) {
                definirErro(e as Error);
            }
        } finally {
            if (montado.current) {
                definirCarregando(false);
            }
        }
    }, [buscar]);

    useEffect(() => {
        montado.current = true;
        carregar();

        let intervalo: ReturnType<typeof setInterval> | undefined;
        if (opcoes?.refetchInterval) {
            intervalo = setInterval(carregar, opcoes.refetchInterval);
        }

        return () => {
            montado.current = false;
            if (intervalo) clearInterval(intervalo);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...chaves, opcoes?.refetchInterval]);

    return {
        dados,
        carregando,
        erro,
        recarregar: carregar
    };
}
