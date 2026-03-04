import { api } from '@compartilhado/servicos/api';
import { AlertaRiscoAbandono, StatusRiscoAbandono } from '../types/riscoAbandono.tipos';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import type { RegistroAcessoLocal } from '@compartilhado/types/bancoLocal.tipos';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const registrar = criarRegistrador('ServicoRiscoAbandono');

// Mocks temporários em memória para suportar a UI enquanto o Backend não possui a rota /risco-abandono
const mockAlertasRiscoAbandono: AlertaRiscoAbandono[] = [
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

export const riscoAbandonoServico = {
    buscarAlertas: async (): Promise<AlertaRiscoAbandono[]> => {
        try {
            const response = await api.obter<AlertaRiscoAbandono[]>('/risco-abandono');
            return response || [];
        } catch (erro) {
            registrar.warn('Endpoint /risco-abandono indisponível ou retornando HTML. Utilizando Fallback Mocks em memória.');
            return [...mockAlertasRiscoAbandono];
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
            registrar.warn(`Endpoint /risco-abandono indisponível para atualização do alerta ${alertaId}. Simulando sucesso no Mock.`);
            const alertaIdx = mockAlertasRiscoAbandono.findIndex(a => a.id === alertaId);
            if (alertaIdx !== -1) {
                mockAlertasRiscoAbandono[alertaIdx].status = novoStatus;
                if (novoStatus === 'RESOLVIDO') {
                    mockAlertasRiscoAbandono[alertaIdx].data_resolucao = new Date().toISOString();
                } else {
                    mockAlertasRiscoAbandono[alertaIdx].data_resolucao = null;
                }
            }
            return true;
        }
    },

    processarMotor: async (): Promise<{ gerados: number; mensagem: string }> => {
        try {
            const response = await api.enviar<{ gerados: number; mensagem: string }>('/risco-abandono/processar', {});
            return response;
        } catch (erro) {
            registrar.warn('Endpoint /risco-abandono/processar indisponível. Simulando varredura do Motor de Faltas no Mock.');
            return {
                gerados: 0,
                mensagem: '(Mock Mapeado) O Motor de Faltas virtual foi simulado com sucesso.'
            };
        }
    }
};
