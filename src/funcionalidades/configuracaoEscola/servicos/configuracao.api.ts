/**
 * API de configuraÃ§Ã£o da escola â€” horÃ¡rios de acesso.
 *
 * @module configuracaoEscola/servicos/configuracao.api
 */
import { api } from '@compartilhado/servicos/api';

/**
 * Busca as janelas de horÃ¡rio configuradas para a escola.
 *
 * @param {string} tenantId
 * @returns {Promise<import('../types/configuracao.tipos').ConfiguracaoHorarios>}
 */
export async function buscarHorarios(tenantId) {
    return api.obter(`/configuracao/${tenantId}/horarios`);
}

/**
 * Salva as janelas de horÃ¡rio da escola.
 *
 * @param {string} tenantId
 * @param {import('../types/configuracao.tipos').JanelaHorario[]} janelas
 * @returns {Promise<Object>}
 */
export async function salvarHorarios(tenantId, janelas) {
    return api.enviar(`/configuracao/${tenantId}/horarios`, { janelas });
}

export const configuracaoApi = {
    buscarHorarios,
    salvarHorarios,
};
