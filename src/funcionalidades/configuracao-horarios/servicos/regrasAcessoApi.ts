/**
 * API de Regras de Acesso da escola — horários de acesso.
 *
 * @module RegrasHorarios/servicos/RegrasHorariosApi
 */
import { api } from '@compartilhado/servicos/api';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('RegrasHorariosApi');

/**
 * Busca as janelas de horário configuradas para a escola.
 */
export const buscarHorariosEscola = async (idEscola: string) => {
    try {
        if (navigator.onLine) {
            const dados = await api.obter<any>('/admin/horarios');
            // Cache local para uso offline posterior
            if (dados && dados.janelas) {
                await bancoLocal.salvarConfiguracaoHorarios({ id: idEscola, ...dados });
            }
            return dados;
        }
    } catch (e) {
        log.warn('Falha ao buscar horários online, usando cache local');
    }

    // Fallback para banco local
    return bancoLocal.buscarConfiguracaoHorarios(idEscola);
};

export const salvarHorariosEscola = async (idEscola: string, janelas: any[]) => {
    let sucessoOnline = false;
    try {
        if (navigator.onLine) {
            await api.atualizar('/admin/horarios', { janelas });
            sucessoOnline = true;
        }
    } catch (e) {
        log.warn('Falha ao salvar horários online, agendando sincronização', e);
        // Registra pendência para o Sync processar depois
        await bancoLocal.adicionarPendencia('UPDATE', 'configuracao_horarios', idEscola, { janelas });
    }

    // Sempre salva localmente para manter o estado imediato (Optimistic UI context)
    await bancoLocal.salvarConfiguracaoHorarios({
        id: idEscola,
        janelas,
        atualizado_em: new Date().toISOString()
    } as any);

    return { sucesso: sucessoOnline };
};

export const RegrasHorariosApi = {
    buscarHorarios: buscarHorariosEscola,
    salvarHorarios: salvarHorariosEscola,
};
