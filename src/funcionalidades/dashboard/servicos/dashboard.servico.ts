import { api } from '@/compartilhado/servicos/api';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';

const log = criarRegistrador('DashboardServico');

export const dashboardServico = {
    async obterEstatisticas() {
        try {
            // Em um cenário real, teríamos um endpoint /estatisticas/dashboard
            // Para manter o sistema online sem quebrar o backend atual, 
            // vamos buscar os dados base e calcular, mas via API (D1)
            const [alunos, registros, turmas, alertas] = await Promise.all([
                api.obter<any[]>('/academico/alunos'),
                api.obter<any[]>('/acesso/registros?limite=50'),
                api.obter<any[]>('/academico/turmas'),
                api.obter<any[]>('/academico/evasao').catch(() => []) // Silencioso se não houver alertas
            ]);

            return {
                alunos,
                registros,
                turmas,
                alertas,
                pendencias: 0
            };
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
    }
};
