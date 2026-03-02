/**
 * API de responsáveis — vinculação de responsável ao aluno.
 *
 * @module responsaveis/servicos/responsaveis.api
 */
import { api } from '@compartilhado/servicos/api';

/**
 * Vincula um responsável a um aluno pelo código fornecido pela escola.
 *
 * @param {import('../types/responsavel.tipos').VinculoAluno} dados
 * @returns {Promise<Object>} Resultado da vinculação
 */
export async function vincular(dados) {
    return api.enviar('/responsaveis/vincular', dados);
}

/**
 * Busca dados de um responsável por ID.
 *
 * @param {string} responsavelId
 * @returns {Promise<import('../types/responsavel.tipos').Responsavel>}
 */
export async function buscarResponsavel(responsavelId) {
    return api.obter(`/responsaveis/${responsavelId}`);
}

export const responsaveisApi = {
    vincular,
    buscarResponsavel,
};
