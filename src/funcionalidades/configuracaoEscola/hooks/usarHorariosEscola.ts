import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import { configuracaoApi } from '../servicos/configuracao.api';
import type { JanelaHorario, ConfiguracaoHorarios } from '../types/configuracao.tipos';

/**
 * Hook para obter e gerenciar as janelas de horário da escola.
 */
export function usarHorariosEscola(tenantId: string) {
    const { dados, carregando, erro, recarregar } = usarConsulta(
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
