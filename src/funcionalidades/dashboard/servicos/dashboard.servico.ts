import { api } from '@/compartilhado/servicos/api';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';

const log = criarRegistrador('DashboardServico');

export const dashboardServico = {
    async obterEstatisticas() {
        try {
            // 🚀 Dimensão 2 Otimizada: Endpoint com Data Aggregation via D1 Batching (Zero N+1)
            return await api.obter<any>('/admin/dashboard');
        } catch (erro) {
            log.error('Erro ao buscar estatísticas do dashboard online', erro);
            throw erro;
        }
    },

    async buscarRegistrosRecentes(desde?: string) {
        try {
            const url = desde ? `/acesso/registros?desde=${desde}&limite=50` : '/acesso/registros?limite=20';
            return await api.obter<any[]>(url);
        } catch (erro) {
            log.error('Erro ao buscar registros recentes', erro);
            return [];
        }
    },

    async limparHistorico() {
        try {
            return await api.remover('/acesso/registros');
        } catch (erro) {
            log.error('Erro ao limpar histórico', erro);
            throw erro;
        }
    }
};
