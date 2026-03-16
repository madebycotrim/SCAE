import { api } from '@/compartilhado/servicos/api';
import { Registrador } from '@/compartilhado/servicos/auditoria';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';

const log = criarRegistrador('TurmaServico');

/**
 * SERVIÇO DE TURMAS (Online-First)
 * Operações administrativas 100% online.
 */
export const turmaServico = {
    /**
     * Busca turmas diretamente da API.
     */
    async carregarOnline() {
        try {
            const turmas = await api.obter<any[]>('/academico/turmas');
            return turmas.map(t => ({ ...t, totalAlunos: t.totalAlunos || 0 }));
        } catch (erro) {
            log.error('Erro ao buscar turmas online', erro);
            throw new Error('Falha ao carregar turmas. Verifique sua conexão.');
        }
    },

    /**
     * Salva ou atualiza uma turma diretamente no servidor.
     */
    async salvarTurma(turma: any, ehEdicao: boolean): Promise<void> {
        if (!navigator.onLine) {
            throw new Error('A gestão de turmas requer conexão ativa com o servidor.');
        }

        const turmaFinal = {
            ...turma,
            atualizado_em: new Date().toISOString(),
            sincronizado: 1
        };

        try {
            await api.enviar('/academico/turmas', turmaFinal);
            
            await Registrador.registrar(ehEdicao ? 'TURMA_EDITAR' : 'TURMA_CRIAR', 'turma', turma.id, {
                ano_letivo: turma.ano_letivo,
                via: 'online_admin'
            });
            
            log.info('Turma processada online com sucesso');
        } catch (erro) {
            log.error('Falha ao salvar turma online', erro);
            throw erro;
        }
    },

    /**
     * Remove uma turma diretamente no servidor.
     */
    async excluirTurma(id: string): Promise<void> {
        if (!navigator.onLine) {
            throw new Error('A exclusão de turmas requer conexão ativa com o servidor.');
        }

        try {
            await api.remover(`/academico/turmas?id=${id}`);
            await Registrador.registrar('TURMA_EXCLUIR', 'turma', id, { status: 'online_admin' });
            log.info('Turma removida com sucesso do servidor');
        } catch (erro) {
            log.error('Falha ao remover turma online', erro);
            throw erro;
        }
    }
};
