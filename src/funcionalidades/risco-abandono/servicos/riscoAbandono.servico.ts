import { api } from '@compartilhado/servicos/api';
import { AlertaRiscoAbandono, StatusRiscoAbandono } from '../types/riscoAbandono.tipos';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import type { RegistroAcessoLocal } from '@compartilhado/types/bancoLocal.tipos';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const registrar = criarRegistrador('ServicoRiscoAbandono');

export const riscoAbandonoServico = {
    buscarAlertas: async (): Promise<AlertaRiscoAbandono[]> => {
        try {
            const response = await api.obter<AlertaRiscoAbandono[]>('/risco-abandono');
            return response || [];
        } catch (erro) {
            registrar.warn('Endpoint /risco-abandono indisponível ou erro na busca de alertas. Retornando vazio.');
            return [];
        }
    },

    buscarHistoricoFaltas: async (matricula: string): Promise<RegistroAcessoLocal[]> => {
        try {
            const historico = await bancoLocal.obterHistoricoAcessoAluno(matricula);
            return historico;
        } catch (erro) {
            registrar.error(`Erro ao buscar histórico de faltas do aluno ${matricula}`, erro);
            return [];
        }
    },

    atualizarStatus: async (alertaId: string, novoStatus: StatusRiscoAbandono): Promise<boolean> => {
        try {
            const response = await api.atualizar<{ success: boolean }>(`/risco-abandono/${alertaId}`, { status: novoStatus });
            return response?.success === true;
        } catch (erro) {
            registrar.error(`Erro ao atualizar o alerta ${alertaId}.`, erro);
            return false;
        }
    },

    processarMotor: async (): Promise<{ gerados: number; mensagem: string }> => {
        try {
            const response = await api.enviar<{ gerados: number; mensagem: string }>('/risco-abandono/processar', {});
            return response;
        } catch (erro) {
            registrar.error('Erro ao processar o Motor de Faltas.', erro);
            return {
                gerados: 0,
                mensagem: 'Erro ao executar o motor.'
            };
        }
    }
};
