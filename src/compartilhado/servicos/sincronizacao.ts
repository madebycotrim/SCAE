import { api } from './api';
import { bancoLocal } from './bancoLocal';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import type { AlunoLocal, RegistroAcessoLocal } from '@/compartilhado/types/bancoLocal.tipos';

const log = criarRegistrador('Sync');

export interface RespostaSincronizacao {
    sucesso: boolean;
    modo: 'ONLINE' | 'OFFLINE';
    id: string;
}

/**
 * SERVIÇO DE SINCRONIZAÇÃO (Versão Simplificada)
 * Focado na resiliência da Portaria (Quiosque).
 * Admin utiliza API Online diretamente.
 */
export const servicoSincronizacao = {
    _sincronizando: false,

    /**
     * Inicia ouvintes de rede e o loop de sincronização.
     */
    iniciarSincronizacaoAutomatica: () => {
        window.addEventListener('online', () => {
            log.info('Conexão restaurada. Sincronizando pendências...');
            servicoSincronizacao.sincronizarTudo();
        });

        // Sync Periódico (cada 15 minutos) para manter o Tablet atualizado
        setInterval(() => {
            if (navigator.onLine) servicoSincronizacao.sincronizarTudo();
        }, 15 * 60 * 1000);

        if (navigator.onLine) setTimeout(() => servicoSincronizacao.sincronizarTudo(), 3000);
    },

    /**
     * Registra um acesso (Usado pelo TerminalAcesso).
     * Estratégia: Network-First com Fallback Offline imediato.
     */
    registrarAcesso: async (registro: Omit<RegistroAcessoLocal, 'sincronizado'>): Promise<RespostaSincronizacao> => {
        try {
            // 1. Tentar salvar Online primeiro
            await api.enviar('/acesso/registros', [{
                ...registro,
                timestamp_acesso: (registro as any).timestamp_acesso || (registro as any).timestamp
            }]);

            // Espelhar localmente como sincronizado
            const banco = await bancoLocal.iniciarBanco();
            await banco.put('registros_acesso', { ...registro, sincronizado: 1 });

            return { sucesso: true, modo: 'ONLINE', id: (registro as any).id };
        } catch (erro) {
            log.warn('Falha no registro online. Salvando localmente para posterior sincronização.', erro);

            // 2. Fallback: Salvar Localmente como não-sincronizado
            try {
                await bancoLocal.salvarRegistro(registro);
                return { sucesso: true, modo: 'OFFLINE', id: (registro as any).id };
            } catch (erroLocal) {
                log.error('Erro crítico: Falha ao salvar no banco local.', erroLocal);
                return { sucesso: false, modo: 'OFFLINE', id: (registro as any).id };
            }
        }
    },

    /**
     * Ciclo Geral de Sincronização.
     */
    sincronizarTudo: async () => {
        if (!navigator.onLine || servicoSincronizacao._sincronizando) return;

        try {
            servicoSincronizacao._sincronizando = true;
            log.info('Iniciando ciclo de sincronização...');

            await servicoSincronizacao.sincronizarRegistrosPendentes();
            await servicoSincronizacao.processarPendencias();

            // Sincronizar dados mestres (Apenas se houver rede, para o Quiosque)
            await Promise.allSettled([
                servicoSincronizacao.baixarAlunos(),
                servicoSincronizacao.baixarTurmas()
            ]);

            localStorage.setItem('ultima_sincronizacao', new Date().toISOString());
        } catch (erro) {
            log.error('Falha no ciclo de sincronização', erro);
        } finally {
            servicoSincronizacao._sincronizando = false;
        }
    },

    async sincronizarRegistrosPendentes() {
        try {
            const banco = await bancoLocal.iniciarBanco();
            const todos = await banco.getAll('registros_acesso');
            const pendentes = todos.filter(r => r.sincronizado === 0);

            if (pendentes.length === 0) return;

            log.info(`Subindo ${pendentes.length} registros pendentes...`);
            await api.enviar('/acesso/registros', pendentes);

            const tx = banco.transaction('registros_acesso', 'readwrite');
            for (const r of pendentes) {
                await tx.store.put({ ...r, sincronizado: 1 });
            }
            await tx.done;
        } catch (erro) {
            log.warn('Erro ao subir registros', erro);
        }
    },

    async processarPendencias() {
        const pendencias = await bancoLocal.listarPendencias();
        if (pendencias.length === 0) return;

        for (const p of pendencias) {
            try {
                if (p.acao === 'DELETE' && p.colecao === 'alunos') {
                    await api.remover(`/academico/alunos?matricula=${p.dado_id}`);
                } else if (p.acao === 'DELETE' && p.colecao === 'turmas') {
                    await api.remover(`/academico/turmas?id=${p.dado_id}`);
                }
                await bancoLocal.removerPendencia(p.id);
            } catch (e) {
                if (String(e).includes('404')) await bancoLocal.removerPendencia(p.id);
            }
        }
    },

    async baixarAlunos() {
        try {
            const alunos = await api.obter<AlunoLocal[]>('/academico/alunos');
            if (Array.isArray(alunos)) await bancoLocal.salvarAlunos(alunos, 1);
        } catch (e) {
            log.warn('Falha ao baixar alunos', e);
        }
    },

    async baixarTurmas() {
        try {
            const turmas = await api.obter<any[]>('/academico/turmas');
            if (Array.isArray(turmas)) await bancoLocal.salvarTurmas(turmas, 1);
        } catch (e) {
            log.warn('Falha ao baixar turmas', e);
        }
    }
};
