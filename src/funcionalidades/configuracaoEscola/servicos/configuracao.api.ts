/**
 * API de configuração da escola — horários de acesso.
 *
 * @module configuracaoEscola/servicos/configuracao.api
 */
import { api } from '@compartilhado/servicos/api';

/**
 * Busca as janelas de horário configuradas para a escola.
 *
 * @param {string} tenantId
 * @returns {Promise<import('../types/configuracao.tipos').ConfiguracaoHorarios>}
 */
export async function buscarHorarios(tenantId) {
    return api.obter(`/configuracao/${tenantId}/horarios`);
}

export async function salvarHorarios(tenantId, janelas) {
    return api.atualizar(`/configuracao/${tenantId}/horarios`, { janelas });
}

export const configuracaoApi = {
    buscarHorarios,
    salvarHorarios,
};
