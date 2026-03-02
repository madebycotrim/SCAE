import { api } from '@compartilhado/servicos/api';
import { AlertaEvasao, StatusEvasao } from '../types/evasao.tipos';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const registrar = criarRegistrador('ServicoEvasao');

// Mocks temporários em memória para suportar a UI enquanto o Backend não possui a rota /evasao
const mockAlertasMemoria: AlertaEvasao[] = [
    {
        id: '1',
        aluno_matricula: '2023001',
        aluno_nome: 'João Silva',
        turma_nome: '1º Ano A',
        motivo: '3 dias consecutivos de falta',
        status: 'PENDENTE',
        data_criacao: new Date().toISOString(),
        data_resolucao: null
    },
    {
        id: '2',
        aluno_matricula: '2023002',
        aluno_nome: 'Maria Souza',
        turma_nome: '2º Ano B',
        motivo: 'Falta sistemática em dias de prova',
        status: 'EM_ANALISE',
        data_criacao: new Date(Date.now() - 86400000).toISOString(),
        data_resolucao: null
    }
];

export const evasaoService = {
    buscarAlertas: async (): Promise<AlertaEvasao[]> => {
        try {
            const response = await api.obter<AlertaEvasao[]>('/evasao');
            return response || [];
        } catch (erro) {
            registrar.warn('Endpoint /evasao indisponível ou retornando HTML. Utilizando Fallback Mocks em memória.');
            return [...mockAlertasMemoria];
        }
    },

    atualizarStatus: async (alertaId: string, novoStatus: StatusEvasao): Promise<boolean> => {
        try {
            const response = await api.atualizar<{ success: boolean }>(`/evasao/${alertaId}`, { status: novoStatus });
            return response?.success === true;
        } catch (erro) {
            registrar.warn(`Endpoint /evasao indisponível para atualização do alerta ${alertaId}. Simulando sucesso no Mock.`);
            const alertaIdx = mockAlertasMemoria.findIndex(a => a.id === alertaId);
            if (alertaIdx !== -1) {
                mockAlertasMemoria[alertaIdx].status = novoStatus;
                if (novoStatus === 'RESOLVIDO') {
                    mockAlertasMemoria[alertaIdx].data_resolucao = new Date().toISOString();
                } else {
                    mockAlertasMemoria[alertaIdx].data_resolucao = null;
                }
            }
            return true;
        }
    },

    processarMotor: async (): Promise<{ gerados: number; mensagem: string }> => {
        try {
            const response = await api.enviar<{ gerados: number; mensagem: string }>('/evasao/processar', {});
            return response;
        } catch (erro) {
            registrar.warn('Endpoint /evasao/processar indisponível. Simulando varredura do Motor de Faltas no Mock.');
            return {
                gerados: 0,
                mensagem: '(Mock Mapeado) O Motor de Faltas virtual foi simulado com sucesso.'
            };
        }
    }
};
