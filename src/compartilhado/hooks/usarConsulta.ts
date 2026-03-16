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
    const [carregando, definirCarregando] = useState(false); // Começa false para respeitar o delay
    const [erro, definirErro] = useState<Error | null>(null);
    const montado = useRef(true);

    const carregar = useCallback(async (exibirLoading = true) => {
        let timerCarregando: any;

        // Só ativa o estado 'carregando' se demorar mais que 180ms
        // Isso evita o 'flicker' em consultas rápidas no IndexedDB
        if (exibirLoading || !dados) {
            timerCarregando = setTimeout(() => {
                if (montado.current) definirCarregando(true);
            }, 180);
        }

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
            if (timerCarregando) clearTimeout(timerCarregando);
            if (montado.current) {
                definirCarregando(false);
            }
        }
    }, [buscar, dados]);

    useEffect(() => {
        montado.current = true;
        
        // Chamada inicial
        carregar(true);

        let intervalo: ReturnType<typeof setInterval> | undefined;
        if (opcoes?.refetchInterval) {
            // Refetch em background para não atrapalhar o usuário
            intervalo = setInterval(() => carregar(false), opcoes.refetchInterval);
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
        recarregar: () => carregar(true),
        atualizarSutil: () => carregar(false)
    };
}

