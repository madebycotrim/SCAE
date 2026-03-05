import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { api } from '@compartilhado/servicos/api';
import { Registrador } from '@compartilhado/servicos/auditoria';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { servicoSincronizacao } from '@compartilhado/servicos/sincronizacao';
import toast from 'react-hot-toast';

const log = criarRegistrador('TurmaServico');

export const turmaServico = {
    /**
     * Salva ou atualiza uma turma com estratégia Online-First.
     */
    async salvarTurma(turma: any, ehEdicao: boolean): Promise<void> {
        const turmaFinal = {
            ...turma,
            atualizado_em: new Date().toISOString(),
            sincronizado: 1
        };

        try {
            // 1. Tentar salvar no servidor primeiro
            if (navigator.onLine) {
                await api.enviar('/academico/turmas', turmaFinal);
                log.info('Turma salva online com sucesso');
            } else {
                throw new Error('Offline');
            }
        } catch (erro) {
            log.warn('Falha ao salvar turma online, recorrendo ao banco local', erro);
            turmaFinal.sincronizado = 0;
        }

        try {
            // 2. Persistir localmente
            const banco = await bancoLocal.iniciarBanco();

            // Lógica de renomeação de ID (se o ID mudou na edição)
            // Esta lógica era tratada no componente, mantemos aqui para consistência
            // Nota: o componente deve passar o idAntigo se hover.

            await banco.put('turmas', turmaFinal);

            // 3. Auditoria
            const acao = ehEdicao ? 'TURMA_EDITAR' : 'TURMA_CRIAR';
            await Registrador.registrar(acao, 'turma', turma.id, {
                ano_letivo: turma.ano_letivo,
                turno: turma.turno,
                via: turmaFinal.sincronizado ? 'online' : 'local'
            });

            if (turmaFinal.sincronizado === 0) {
                if (navigator.onLine) {
                    toast.success('Salvo localmente (Sincronização pendente)');
                    // Tenta sincronizar imediatamente caso tenha sido erro transiente ou recuperação rápida
                    servicoSincronizacao.sincronizarTudo();
                } else {
                    toast.success('Salvo localmente (Modo Offline)');
                }
            }
        } catch (erroLocal) {
            log.error('Erro ao salvar turma localmente', erroLocal);
            throw erroLocal;
        }
    },

    /**
     * Remove uma turma com estratégia Online-First.
     */
    async excluirTurma(id: string): Promise<void> {
        let removidoOnline = false;
        try {
            // 1. Tentar remover do servidor primeiro
            if (navigator.onLine) {
                // Rota corrigida para query parameter id
                await api.remover(`/academico/turmas?id=${id}`);
                removidoOnline = true;
            } else {
                throw new Error('Offline (DELETE)');
            }
        } catch (erro) {
            log.warn('Falha ao remover turma online, agendando para depois', erro);
            await bancoLocal.adicionarPendencia('DELETE', 'turmas', id);
        }

        try {
            // 2. Remover localmente
            const banco = await bancoLocal.iniciarBanco();
            await banco.delete('turmas', id);

            await Registrador.registrar('TURMA_EXCLUIR', 'turma', id, { status: removidoOnline ? 'online' : 'pendente' });
        } catch (erroLocal) {
            log.error('Erro ao excluir turma localmente', erroLocal);
            throw erroLocal;
        }
    }
};
