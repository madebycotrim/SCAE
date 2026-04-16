import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import { RegrasHorariosApi } from '../servicos/regrasAcessoApi';
import type { JanelaHorarioAcesso, ConfiguracaoHorarios } from '../types/regrasHorarios.tipos';
import { bancoLocal } from '@/compartilhado/servicos/bancoLocal';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import toast from 'react-hot-toast';
import { useState } from 'react';

const log = criarRegistrador('RegrasHorarios');

/**
 * Hook para obter e gerenciar as janelas de horário (regras de acesso) da escola.
 * Resiliente à falta de internet (Offline-First-ish).
 */
export function usarRegrasHorarios(idEscola: string) {
    const [usandoCache, setUsandoCache] = useState(!navigator.onLine);

    const { dados, carregando, erro, recarregar } = usarConsulta(
        ['configuracao-horarios', idEscola],
        async () => {
            try {
                // No Admin, buscamos sempre o dado mais fresco
                const resposta = await RegrasHorariosApi.buscarHorarios(idEscola) as any;
                
                // Atualizamos o cache local silenciosamente para que o Tablet (offline) se beneficie
                if (resposta) {
                    bancoLocal.salvarConfiguracaoHorarios({ ...resposta, id: idEscola, escola_id: idEscola });
                }
                
                setUsandoCache(false);
                return resposta as ConfiguracaoHorarios;
            } catch (e) {
                log.error('Erro ao buscar horários online', e);
                // Fallback apenas se a API estiver realmente fora, mas avisamos o usuário
                const local = await bancoLocal.buscarConfiguracaoHorarios(idEscola);
                if (local) {
                    setUsandoCache(true);
                    return local;
                }
                throw e; 
            }
        }
    );

    const configuracao = dados as ConfiguracaoHorarios | null;

    const salvar = async (janelas: JanelaHorarioAcesso[]) => {
        try {
            // Atualiza otimista o cache de leitura para o app responder rápido
            await bancoLocal.salvarConfiguracaoHorarios({
                id: idEscola,
                escola_id: idEscola,
                janelas,
                atualizado_em: new Date().toISOString()
            });

            if (navigator.onLine) {
                await RegrasHorariosApi.salvarHorarios(idEscola, janelas);
                toast.success('Horários salvos online');
            } else {
                throw new Error('A alteração de horários administrativos requer conexão ativa.');
            }

            await recarregar();

        } catch (e) {
            // Fallback caso a API dê timeout mas navigator achava que estava online
            await bancoLocal.adicionarPendencia('UPDATE', 'configuracao_horarios', idEscola, { janelas });
            toast.success('Salvo offline (Falha na rede).', { icon: '📴' });
            await recarregar();
        }
    };

    return {
        regras: configuracao?.janelas || [],
        configuracao,
        carregando,
        erro: (!navigator.onLine && !configuracao) ? erro : null, // Mente que não tem erro se tiver cache
        recarregar,
        salvar,
        usandoCache
    };
}

