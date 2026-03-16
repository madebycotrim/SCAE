import { bancoLocal } from '@/compartilhado/servicos/bancoLocal';
import { api } from '@/compartilhado/servicos/api';
import { Registrador } from '@/compartilhado/servicos/auditoria';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { servicoSincronizacao } from '@/compartilhado/servicos/sincronizacao';
import toast from 'react-hot-toast';

const log = criarRegistrador('TurmaServico');

export const turmaServico = {
    /**
     * Busca turmas diretamente da API para o Admin.
     */
    async carregarOnline() {
        try {
            const turmas = await api.obter<any[]>('/academico/turmas');
            const turmasComContagem = await Promise.all(turmas.map(async (t) => {
                // A API já deve retornar a contagem se possível, ou fazemos um ajuste aqui
                return { ...t, totalAlunos: t.totalAlunos || 0 };
            }));
            return turmasComContagem;
        } catch (erro) {
            log.error('Erro ao buscar turmas online', erro);
            // Fallback para local apenas em caso de desespero
            const banco = await bancoLocal.iniciarBanco();
            return await banco.getAll('turmas');
        }
    },

    /**
     * Salva ou atualiza uma turma com estratégia Online-First.
     */
    async salvarTurma(turma: any, ehEdicao: boolean, admin = true): Promise<void> {
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
            log.warn('Falha ao salvar turma online', erro);
            if (admin) throw erro;
            turmaFinal.sincronizado = 0;
        }

        if (admin) {
            await Registrador.registrar(ehEdicao ? 'TURMA_EDITAR' : 'TURMA_CRIAR', 'turma', turma.id, {
                ano_letivo: turma.ano_letivo,
                via: 'online_admin'
            });
            return;
        }

        try {
            // 2. Persistir localmente apenas se não for admin
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
    async excluirTurma(id: string, admin = true): Promise<void> {
        let removidoOnline = false;
        try {
            // 1. Tentar remover do servidor primeiro
            if (navigator.onLine) {
                await api.remover(`/academico/turmas?id=${id}`);
                removidoOnline = true;
            } else if (admin) {
                throw new Error('A exclusão de turma requer conexão com o servidor.');
            }
        } catch (erro) {
            log.warn('Falha ao remover turma online', erro);
            if (admin) throw erro;
            await bancoLocal.adicionarPendencia('DELETE', 'turmas', id);
        }

        if (admin) {
            await Registrador.registrar('TURMA_EXCLUIR', 'turma', id, { status: 'online_admin' });
            return;
        }

        try {
            // 2. Remover localmente apenas se não for admin
            const banco = await bancoLocal.iniciarBanco();
            await banco.delete('turmas', id);

            await Registrador.registrar('TURMA_EXCLUIR', 'turma', id, { status: removidoOnline ? 'online' : 'pendente' });
        } catch (erroLocal) {
            log.error('Erro ao excluir turma localmente', erroLocal);
            throw erroLocal;
        }
    }
};
