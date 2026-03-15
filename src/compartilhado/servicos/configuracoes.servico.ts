import { api } from './api';

export const ConfiguracoesServico = {
    async buscarConfiguracoes() {
        const res = await api.obter<any>('/admin/configuracoes');
        return res;
    },

    async atualizarConfiguracoes(dados: { qrDinamico?: boolean; ttsAtivado?: boolean }) {
        const res = await api.atualizar<any>('/admin/configuracoes', dados);
        return res;
    }
};
