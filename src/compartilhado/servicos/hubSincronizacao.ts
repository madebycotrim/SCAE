import { api } from './api';
import { bancoLocal } from './bancoLocal';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import type { RegistroAcessoLocal } from '@compartilhado/types/bancoLocal.tipos';

const log = criarRegistrador('HubSync');

export interface RespostaSincronizacao {
    sucesso: boolean;
    modo: 'ONLINE' | 'OFFLINE';
    id: string;
}

/**
 * Hub Inteligente de Sincronização.
 * Implementa a estratégia "Network-First":
 * 1. Tenta enviar o dado diretamente para o servidor (D1).
 * 2. Se falhar (offline ou erro 5xx), salva no IndexedDB para sincronização posterior pelo Worker.
 */
export const hubSincronizacao = {
    /**
     * Registra um acesso de aluno.
     * Tenta salvar no D1 imediatamente.
     */
    registrarAcesso: async (registro: Omit<RegistroAcessoLocal, 'sincronizado'>): Promise<RespostaSincronizacao> => {
        try {
            // 1. Tentar salvar Online primeiro
            // O backend espera um array ou objeto único, precisamos conferir o contrato de registros.ts
            // No service worker estava enviando [batch]. Para o Quiosque, enviamos um de cada vez ou batch pequeno.
            log.info(`Tentativa de registro online para aluno: ${registro.aluno_matricula}`);

            await api.enviar('/acesso/registros', [
                {
                    ...registro,
                    timestamp_acesso: registro.timestamp_acesso || (registro as any).timestamp
                }
            ]);

            // Se chegou aqui, salvou no D1.
            // Para manter o cache local atualizado (ex: para relatórios offline/evacuação), salvamos localmente também como sincronizado.
            await bancoLocal.iniciarBanco().then(async (db) => {
                await db.put('registros_acesso', { ...registro, sincronizado: 1 });
            });

            return {
                sucesso: true,
                modo: 'ONLINE',
                id: registro.id
            };

        } catch (erro) {
            log.warn('Falha na tentativa ONLINE. Migrando para modo resiliente (OFFLINE).', erro);

            // 2. Fallback: Salvar Localmente como não-sincronizado
            try {
                await bancoLocal.salvarRegistro(registro);

                return {
                    sucesso: true,
                    modo: 'OFFLINE',
                    id: registro.id
                };
            } catch (erroLocal) {
                log.error('Erro crítico: Falha ao salvar até no banco local.', erroLocal);
                return {
                    sucesso: false,
                    modo: 'OFFLINE',
                    id: registro.id
                };
            }
        }
    }
};
