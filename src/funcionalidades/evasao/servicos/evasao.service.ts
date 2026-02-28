import { api } from '@compartilhado/servicos/api';
import { AlertaEvasao, StatusEvasao } from '../types/evasao.tipos';

export const evasaoService = {
    buscarAlertas: async (): Promise<AlertaEvasao[]> => {
        const response = await api.obter<AlertaEvasao[]>('/evasao');
        return response || [];
    },

    atualizarStatus: async (alertaId: string, novoStatus: StatusEvasao): Promise<boolean> => {
        const response = await api.atualizar<{ success: boolean }>(`/evasao/${alertaId}`, { status: novoStatus });
        return response?.success === true;
    },

    processarMotor: async (): Promise<{ gerados: number; mensagem: string }> => {
        const response = await api.enviar<{ gerados: number; mensagem: string }>('/evasao/processar', {});
        return response;
    }
};
