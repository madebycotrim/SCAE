import { api } from '@/compartilhado/servicos/api';
import { AlertaRiscoAbandono, StatusRiscoAbandono } from '../types/riscoAbandono.tipos';
import type { RegistroAcessoLocal } from '@/compartilhado/types/bancoLocal.tipos';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';

const registrar = criarRegistrador('ServicoRiscoAbandono');

export const riscoAbandonoServico = {
    /**
     * Busca todos os alertas de evasão da escola.
     * @returns Lista de alertas de risco de abandono
     */
    buscarAlertas: async (): Promise<AlertaRiscoAbandono[]> => {
        try {
            const response = await api.obter<AlertaRiscoAbandono[]>('/academico/evasao');
            return response || [];
        } catch (erro) {
            registrar.warn('Endpoint /api/academico/evasao indisponível ou erro na busca de alertas. Retornando vazio.');
            return [];
        }
    },

    /**
     * Busca o histórico de acessos de um aluno específico.
     * @param matricula - Matrícula do aluno
     * @returns Lista de registros de acesso
     */
    buscarHistoricoFaltas: async (matricula: string): Promise<RegistroAcessoLocal[]> => {
        try {
            const response = await api.obter<RegistroAcessoLocal[]>(`/acesso/registros?matricula=${matricula}`);
            return response || [];
        } catch (erro) {
            registrar.error(`Erro ao buscar histórico de faltas online do aluno ${matricula}`, erro);
            return [];
        }
    },

    /**
     * Atualiza o status de um alerta de risco de abandono.
     * @param alertaId - ID do alerta a ser atualizado
     * @param novoStatus - Novo status (PENDENTE, EM_ANALISE, RESOLVIDO)
     * @returns True se atualizado com sucesso
     */
    atualizarStatus: async (alertaId: string, novoStatus: StatusRiscoAbandono): Promise<boolean> => {
        try {
            await api.atualizar<{ success: boolean }>(`/academico/evasao/${alertaId}`, { status: novoStatus });
            return true;
        } catch (erro) {
            registrar.error(`Erro ao atualizar o alerta de evasão ${alertaId}.`, erro);
            return false;
        }
    },

    /**
     * Executa o Motor de Faltas para identificar novos casos de evasão.
     * @returns Objeto com a quantidade de alertas gerados e mensagem de retorno
     */
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
