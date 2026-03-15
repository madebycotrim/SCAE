import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfiguracoesServico } from '@compartilhado/servicos/configuracoes.servico';
import toast from 'react-hot-toast';

export function usarConfiguracoesEscola() {
    const queryClient = useQueryClient();

    const { data: configs, isLoading, error } = useQuery({
        queryKey: ['configuracoes-escola'],
        queryFn: ConfiguracoesServico.buscarConfiguracoes
    });

    const mutation = useMutation({
        mutationFn: ConfiguracoesServico.atualizarConfiguracoes,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['configuracoes-escola'] });
            toast.success('Configurações atualizadas!');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Falha ao atualizar configurações');
        }
    });

    return {
        configs,
        isLoading,
        error,
        salvar: mutation.mutate,
        salvando: mutation.isPending
    };
}
