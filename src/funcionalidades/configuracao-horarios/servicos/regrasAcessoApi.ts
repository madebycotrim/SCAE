/**
 * API de Regras de Acesso da escola — horários de acesso.
 */
import { api } from '@/compartilhado/servicos/api';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';

const log = criarRegistrador('RegrasHorariosApi');

/**
 * Busca as janelas de horário configuradas para a escola (Online-only para Admin).
 */
export const buscarHorariosEscola = async (idEscola: string) => {
    try {
        const dados = await api.obter<any>('/admin/horarios');
        return dados;
    } catch (e) {
        log.error('Erro ao buscar horários online', e);
        throw new Error('Não foi possível carregar as regras de horário do servidor.');
    }
};

/**
 * Salva as janelas de horário diretamente no servidor.
 */
export const salvarHorariosEscola = async (idEscola: string, janelas: any[]) => {
    if (!navigator.onLine) {
        throw new Error('A alteração de horários requer conexão ativa com o servidor.');
    }

    try {
        await api.atualizar('/admin/horarios', { janelas });
        return { sucesso: true };
    } catch (e) {
        log.error('Falha ao salvar horários online', e);
        throw new Error('Erro ao salvar as regras de horário no servidor.');
    }
};

export const RegrasHorariosApi = {
    buscarHorarios: buscarHorariosEscola,
    salvarHorarios: salvarHorariosEscola,
};
