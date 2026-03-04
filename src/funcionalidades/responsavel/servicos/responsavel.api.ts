import { api } from '@compartilhado/servicos/api';
import {
    RespostaResponsavel,
    RespostaListaResponsaveis,
    DadosResponsavel
} from '../tipos/responsavel.tipos';

/**
 * Serviço para gestão de responsáveis e vínculos com alunos (LGPD).
 */
export const responsavelApi = {
    /**
     * Busca um responsável pelo ID.
     */
    buscarPorId: async (id: string): Promise<RespostaResponsavel> => {
        const data = await api.obter<RespostaResponsavel>(`/v1/responsavel/${id}`);
        return data;
    },

    /**
     * Lista responsáveis de uma escola (paginado).
     */
    listar: async (params: { pagina?: number; porPagina?: number } = {}): Promise<RespostaListaResponsaveis> => {
        const query = new URLSearchParams(params as any).toString();
        const rota = `/v1/responsavel${query ? `?${query}` : ''}`;
        const data = await api.obter<RespostaListaResponsaveis>(rota);
        return data;
    },

    /**
     * Cria ou atualiza um responsável.
     */
    salvar: async (dados: Partial<DadosResponsavel>): Promise<RespostaResponsavel> => {
        const data = await api.enviar<RespostaResponsavel>('/v1/responsavel', dados);
        return data;
    },

    /**
     * Vincula um responsável a um aluno (matrícula).
     */
    vincularAluno: async (responsavelId: string, matricula: string): Promise<{ mensagem: string }> => {
        const data = await api.enviar<{ mensagem: string }>(`/v1/responsavel/${responsavelId}/vinculos`, { matricula });
        return data;
    },

    /**
     * Remove o vínculo entre responsável e aluno.
     */
    removerVinculo: async (responsavelId: string, matricula: string): Promise<{ mensagem: string }> => {
        await api.remover(`/v1/responsavel/${responsavelId}/vinculos/${matricula}`);
        return { mensagem: 'Vínculo removido com sucesso' };
    },

};

