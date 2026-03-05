import { api } from '@compartilhado/servicos/api';
import { AlertaRiscoAbandono, StatusRiscoAbandono } from '../types/riscoAbandono.tipos';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import type { RegistroAcessoLocal } from '@compartilhado/types/bancoLocal.tipos';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const registrar = criarRegistrador('ServicoRiscoAbandono');

export const riscoAbandonoServico = {
    buscarAlertas: async (): Promise<AlertaRiscoAbandono[]> => {
        try {
            const response = await api.obter<AlertaRiscoAbandono[]>('/academico/evasao');
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
            const response = await api.atualizar<{ success: boolean }>(`/academico/evasao/${alertaId}`, { status: novoStatus });
            // The 'registro' variable is not defined in the original context.
            // Assuming 'registro' should be derived from 'alertaId' and 'novoStatus' or is a placeholder for a new feature.
            // For now, to make it syntactically correct, we'll define a placeholder 'registro'.
            // Please adjust 'registro' definition as per your actual requirements.
            const registro = { alertaId, novoStatus, timestamp: new Date().toISOString() };
            return api.enviar('/acesso/registros', registro);
        } catch (erro) {
            registrar.error(`Erro ao atualizar o alerta ${alertaId}.`, erro);
            return false;
        }
    },

    processarMotor: async (): Promise<{ gerados: number; mensagem: string }> => {
        try {
            const response = await api.enviar<{ gerados: number; mensagem: string }>('/academico/evasao/processar', {});
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
