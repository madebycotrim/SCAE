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
export const buscarHorariosEscola = async (_idEscola: string) => {
    return api.obter('/admin/horarios');
};

export const salvarHorariosEscola = async (_idEscola: string, janelas: any[]) => {
    return api.atualizar('/admin/horarios', { janelas });
};

export const RegrasHorariosApi = {
    buscarHorarios: buscarHorariosEscola,
    salvarHorarios: salvarHorariosEscola,
};
