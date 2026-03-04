import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import { RegrasHorariosApi } from '../servicos/regrasAcessoApi';
import type { JanelaHorarioAcesso, ConfiguracaoHorarios } from '../types/regrasHorarios.tipos';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
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
                // Tenta buscar atualizado da API
                const resposta = await RegrasHorariosApi.buscarHorarios(idEscola) as ConfiguracaoHorarios;
                // Salva o cache
                await bancoLocal.salvarConfiguracaoHorarios({ ...resposta, id: idEscola, escola_id: idEscola });
                setUsandoCache(false);
                return resposta;
            } catch (e) {
                // Se falhar (offline), busca cache no IndexedDB local
                const local = await bancoLocal.buscarConfiguracaoHorarios(idEscola);
                if (local) {
                    log.info('Sem rede ou servidor off. Retornando configuração a partir do cache local.');
                    setUsandoCache(true);
                    return local;
                }
                throw e; // Lança erro se não tem nada no banco
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
            } else {
                // Em modo offline, registramos na fila de pendências padrão do app
                await bancoLocal.adicionarPendencia('UPDATE', 'configuracao_horarios', idEscola, { janelas });
                toast.success('Edição salva na Fila Offline.', { icon: '📴' });
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

