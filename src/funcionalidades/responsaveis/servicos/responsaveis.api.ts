/**
 * API de responsÃ¡veis â€” vinculaÃ§Ã£o de responsÃ¡vel ao aluno.
 *
 * @module responsaveis/servicos/responsaveis.api
 */
import { api } from '@compartilhado/servicos/api';

/**
 * Vincula um responsÃ¡vel a um aluno pelo cÃ³digo fornecido pela escola.
 *
 * @param {import('../types/responsavel.tipos').VinculoAluno} dados
 * @returns {Promise<Object>} Resultado da vinculaÃ§Ã£o
 */
export async function vincular(dados) {
    return api.enviar('/responsaveis/vincular', dados);
}

/**
 * Busca dados de um responsÃ¡vel por ID.
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
