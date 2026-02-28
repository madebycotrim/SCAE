import { useConsulta } from '@compartilhado/hooks/useConsulta';
import { configuracaoApi } from '../servicos/configuracao.api';
import type { JanelaHorario, ConfiguracaoHorarios } from '../types/configuracao.tipos';

/**
 * Hook para obter e gerenciar as janelas de horário da escola.
 */
export function useHorariosEscola(tenantId: string) {
    const { dados, carregando, erro, recarregar } = useConsulta(
        ['horarios-escola', tenantId],
        () => configuracaoApi.buscarHorarios(tenantId)
    );

    const configuracao = dados as ConfiguracaoHorarios | null;

    const salvar = async (janelas: JanelaHorario[]) => {
        await configuracaoApi.salvarHorarios(tenantId, janelas);
        await recarregar();
    };

    return {
        horarios: configuracao?.janelas || [],
        configuracao,
        carregando,
        erro,
        recarregar,
        salvar
    };
}
