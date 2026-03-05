import { api } from './api';
import { bancoLocal } from './bancoLocal';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import toast from 'react-hot-toast';

const log = criarRegistrador('AcademicoSync');

/**
 * Serviço de sincronização em segundo plano para dados acadêmicos (Turmas e Alunos).
 */
export const academicoSync = {
    /**
     * Sincroniza todos os dados acadêmicos pendentes (sincronizado = 0).
     */
    async sincronizarTudo(): Promise<void> {
        if (!navigator.onLine) return;

        try {
            await Promise.all([
                this.sincronizarTurmas(),
                this.sincronizarAlunos()
            ]);
        } catch (erro) {
            log.error('Erro na sincronização acadêmica automática', erro);
        }
    },

    /**
     * Pura as turmas locais não sincronizadas e envia para o D1.
     */
    async sincronizarTurmas(): Promise<void> {
        const banco = await bancoLocal.iniciarBanco();
        const turmasPendentes = await banco.getAllFromIndex('turmas', 'sincronizado' as any, 0);

        if (turmasPendentes.length === 0) return;

        log.info(`Sincronizando ${turmasPendentes.length} turmas pendentes...`);

        for (const turma of turmasPendentes) {
            try {
                // Remove o campo local 'sincronizado' antes de enviar, se necessário, 
                // mas o backend ignora campos extras do Zod normalmente.
                await api.enviar('/academico/turmas', turma);

                // Marcar como sincronizado localmente
                await banco.put('turmas', { ...turma, sincronizado: 1 });
                log.info(`Turma ${turma.id} sincronizada.`);
            } catch (erro) {
                log.error(`Falha ao sincronizar turma ${turma.id}`, erro);
            }
        }
    },

    /**
     * Pura os alunos locais não sincronizados e envia para o D1.
     */
    async sincronizarAlunos(): Promise<void> {
        const banco = await bancoLocal.iniciarBanco();
        const alunosPendentes = await banco.getAllFromIndex('alunos', 'sincronizado', 0);

        if (alunosPendentes.length === 0) return;

        log.info(`Sincronizando ${alunosPendentes.length} alunos pendentes...`);

        for (const aluno of alunosPendentes) {
            try {
                await api.enviar('/academico/alunos', aluno);

                // Marcar como sincronizado localmente
                await banco.put('alunos', { ...aluno, sincronizado: 1 });
                log.info(`Aluno ${aluno.matricula} sincronizado.`);
            } catch (erro) {
                log.error(`Falha ao sincronizar aluno ${aluno.matricula}`, erro);
            }
        }
    }
};
