import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import { RegrasHorariosApi } from '../servicos/regrasAcessoApi';
import type { JanelaHorarioAcesso, ConfiguracaoHorarios } from '../types/regrasHorarios.tipos';

/**
 * Hook para obter e gerenciar as janelas de horário (regras de acesso) da escola.
 */
export function usarRegrasHorarios(idEscola: string) {
    const { dados, carregando, erro, recarregar } = usarConsulta(
        ['configuracao-horarios', idEscola],
        () => RegrasHorariosApi.buscarHorarios(idEscola)
    );

    const configuracao = dados as ConfiguracaoHorarios | null;

    const salvar = async (janelas: JanelaHorarioAcesso[]) => {
        await RegrasHorariosApi.salvarHorarios(idEscola, janelas);
        await recarregar();
    };

    return {
        regras: configuracao?.janelas || [],
        configuracao,
        carregando,
        erro,
        recarregar,
        salvar
    };
}

