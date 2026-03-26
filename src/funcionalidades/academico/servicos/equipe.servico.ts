import { api } from '@/compartilhado/servicos/api';
import { DadosEquipe, DadosGrupoEquipe } from '@/funcionalidades/academico/tipos/equipe';

export const servicoEquipe = {
    async listarEquipes(): Promise<DadosEquipe[]> {
        return await api.obter<DadosEquipe[]>('/academico/equipes');
    },

    async salvarEquipe(equipe: Partial<DadosEquipe>) {
        return await api.enviar<DadosEquipe>('/academico/equipes', equipe);
    },

    async removerEquipe(id: string) {
        await api.remover(`/academico/equipes?id=${id}`);
    },

    async listarGrupos(equipeId: string): Promise<DadosGrupoEquipe[]> {
        return await api.obter<DadosGrupoEquipe[]>(`/academico/equipes-grupos?equipe_id=${equipeId}`);
    },

    async salvarGrupo(grupo: Partial<DadosGrupoEquipe>) {
        return await api.enviar<DadosGrupoEquipe>('/academico/equipes-grupos', grupo);
    },

    async removerGrupo(id: string) {
        await api.remover(`/academico/equipes-grupos?id=${id}`);
    }
};
