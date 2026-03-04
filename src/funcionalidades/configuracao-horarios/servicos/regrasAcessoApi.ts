/**
 * API de Regras de Acesso da escola — horários de acesso.
 *
 * @module RegrasHorarios/servicos/RegrasHorariosApi
 */
import { api } from '@compartilhado/servicos/api';

/**
 * Busca as janelas de horário configuradas para a escola.
 *
 * @param {string} idEscola
 * @returns {Promise<import('../types/RegrasHorariosTipos').ConfiguracaoHorarios>}
 */
export async function buscarHorarios(idEscola) {
    return api.obter(`/configuracao/${idEscola}/horarios`);
}

export async function salvarHorarios(idEscola, janelas) {
    return api.atualizar(`/configuracao/${idEscola}/horarios`, { janelas });
}

export const RegrasHorariosApi = {
    buscarHorarios,
    salvarHorarios,
};
