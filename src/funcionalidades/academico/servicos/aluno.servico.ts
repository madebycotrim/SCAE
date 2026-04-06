import { api } from '@/compartilhado/servicos/api';
import { Registrador } from '@/compartilhado/servicos/auditoria';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { Aluno, ResultadoImportacao } from '../tipos/academico';

const log = criarRegistrador('AlunoServico');

/**
 * SERVIÇO DE ALUNOS (Online-First)
 * Módulo Administrativo: Operações 100% online.
 * O banco local é mantido apenas como cache para o módulo de Portaria via sincronizacao.ts.
 */
export const alunoServico = {
    /**
     * Busca dados diretamente da API (D1) para o Painel Administrativo.
     * Não há fallback para banco local aqui para evitar dados obsoletos no Admin.
     */
    async carregarOnline() {
        try {
            const [alunos, turmas] = await Promise.all([
                api.obter<Aluno[]>('/academico/alunos'),
                api.obter<any[]>('/academico/turmas')
            ]);
            
            return { 
                alunos: alunos.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)), 
                turmas: turmas.sort((a, b) => a.id.localeCompare(b.id))
            };
        } catch (erro) {
            log.error('Erro ao buscar dados online', erro);
            throw new Error('Falha ao conectar com o servidor. Verifique sua rede.');
        }
    },

    /**
     * Salva ou atualiza um aluno diretamente no servidor.
     */
    async salvarAluno(aluno: Aluno, ehEdicao: boolean, alunoAnterior?: Aluno): Promise<void> {
        if (!navigator.onLine) {
            throw new Error('A gestão de alunos requer conexão ativa com o servidor.');
        }

        const alunoFinal: Aluno = {
            ...aluno,
            atualizado_em: new Date().toISOString(),
            sincronizado: 1
        };

        try {
            // Se for edição, usa PATCH (api.atualizar). Se for novo, usa POST (api.enviar).
            if (ehEdicao) {
                await api.atualizar('/academico/alunos', alunoFinal);
            } else {
                await api.enviar('/academico/alunos', alunoFinal);
            }
            
            // Auditoria completa: Novo vs Anterior
            await Registrador.registrar(
                ehEdicao ? 'EDITAR_ALUNO' : 'CRIAR_ALUNO', 
                'aluno', 
                aluno.matricula, 
                { ...alunoFinal, via: 'online_admin' }, 
                ehEdicao ? { ...alunoAnterior } : undefined
            );
            
            log.info(`Aluno ${ehEdicao ? 'atualizado' : 'cadastrado'} online com sucesso`);

            // --- Gatilho Instantâneo p/ Agente Local (Sync Real-Time) ---
            fetch('http://127.0.0.1:1912/sync-now', { 
                method: 'POST',
                mode: 'no-cors' 
            }).catch(() => {});
        } catch (erro) {
            log.error('Falha ao salvar aluno online', erro);
            throw erro;
        }
    },

    /**
     * Remove um aluno diretamente no servidor.
     */
    async excluirAluno(matricula: string): Promise<void> {
        if (!navigator.onLine) {
            throw new Error('A exclusão de alunos requer conexão ativa com o servidor.');
        }

        try {
            await api.remover(`/academico/alunos?matricula=${matricula}`);
            await Registrador.registrar('DELETAR_ALUNO', 'aluno', matricula, { status: 'online_admin' });
            log.info('Aluno removido do servidor com sucesso');

            // --- Gatilho Instantâneo p/ Agente Local (Sync Real-Time) ---
            fetch('http://127.0.0.1:1912/sync-now', { 
                method: 'POST',
                mode: 'no-cors' 
            }).catch(() => {});
            
        } catch (erro) {
            log.error('Falha ao remover aluno online', erro);
            throw erro;
        }
    },

    /**
     * Promove um lote de alunos diretamente no servidor.
     */
    async promoverEmLote(matriculas: string[], novaTurmaId: string): Promise<void> {
        if (!navigator.onLine) {
            throw new Error('A promoção de alunos requer conexão ativa com o servidor.');
        }

        try {
            await api.enviar('/academico/alunos/lote/promocao', { matriculas, nova_turma: novaTurmaId });
            
            await Registrador.registrar('ALUNOS_PROMOCAO_LOTE', 'aluno', 'LOTE', {
                quantidade: matriculas.length,
                nova_turma: novaTurmaId,
                via: 'online_admin'
            });
            
            log.info('Promoção em lote realizada com sucesso');
        } catch (erro) {
            log.error('Falha na promoção em lote online', erro);
            throw erro;
        }
    },

    /**
     * Importa alunos enviando lote diretamente para o servidor.
     */
    async importarAlunos(dados: any[], alunosExistentes: Aluno[]): Promise<ResultadoImportacao> {
        if (!navigator.onLine) {
            throw new Error('A importação de alunos requer conexão ativa com o servidor.');
        }

        let sucessos = 0;
        let erros = 0;
        const errosDetalhes: string[] = [];
        const novosAlunos: Aluno[] = [];
        const matriculasExistentes = new Set(alunosExistentes.map(a => a.matricula));
        const dataCriacao = new Date().toISOString();

        for (const linha of dados) {
            let nome, matricula, turma;

            if (Array.isArray(linha)) {
                if (linha.length < 2) continue;
                [nome, matricula, turma] = linha;
            } else {
                nome = linha['Nome Completo'] || linha['Nome'] || linha['nome'];
                matricula = linha['Matricula'] || linha['Matrícula'] || linha['matricula'];
                turma = linha['Turma'] || linha['turma'];
            }

            const matriculaLimpa = String(matricula || '').trim();

            if (!nome || !matriculaLimpa) {
                if (!nome && !matriculaLimpa) continue;
                erros++;
                continue;
            }

            if (matriculasExistentes.has(matriculaLimpa)) {
                erros++;
                errosDetalhes.push(`Matrícula duplicada: ${matriculaLimpa} (${nome})`);
                continue;
            }

            novosAlunos.push({
                nome_completo: nome,
                matricula: matriculaLimpa,
                turma_id: turma || '',
                ativo: true,
                criado_em: dataCriacao,
                sincronizado: 1
            });
            matriculasExistentes.add(matriculaLimpa);
            sucessos++;
        }

        if (novosAlunos.length > 0) {
            try {
                await api.enviar('/academico/alunos', novosAlunos);
                log.info(`Importação concluída: ${novosAlunos.length} alunos salvos no servidor.`);
                
                // --- Gatilho Instantâneo p/ Agente Local (Sync Real-Time) ---
                fetch('http://127.0.0.1:1912/sync-now', { method: 'POST', mode: 'no-cors' }).catch(() => {});
            } catch (erro) {
                log.error('Falha ao importar lote no servidor', erro);
                throw new Error('Falha ao salvar dados no servidor durante a importação.');
            }
        }

        return { total: dados.length, sucessos, erros, detalhes: errosDetalhes };
    }
};
