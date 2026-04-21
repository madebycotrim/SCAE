import { api } from '@/compartilhado/servicos/api';
import { Registrador } from '@/compartilhado/servicos/auditoria';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { Aluno, ResultadoImportacao } from '../tipos/academico';
import { agenteServico } from '@/compartilhado/servicos/agente.servico';

const log = criarRegistrador('AlunoServico');

/**
 * SERVIÇO DE ALUNOS (Online-First)
 * Módulo Administrativo: Operações 100% online.
 * O banco local é mantido apenas como cache para o módulo de Portaria via sincronizacao.ts.
 */
export const alunoServico = {
    /**
     * Busca os dados acadêmicos (alunos e turmas) diretamente do servidor central.
     * @returns {Promise<{ alunos: Aluno[], turmas: any[] }>} Objeto contendo listas de alunos e turmas ordenadas.
     * @throws {Error} Caso a requisição ao servidor falhe.
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
     * Realiza o cadastro ou edição de um aluno no servidor.
     * @param aluno - Objeto com os dados do aluno a serem salvos.
     * @param ehEdicao - Booleano indicando se é uma atualização de registro existente.
     * @param alunoAnterior - (Opcional) Dados prévios do aluno para fins de auditoria em caso de edição.
     * @throws {Error} Caso o sistema esteja offline ou a API retorne erro.
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
            if (ehEdicao) {
                await api.atualizar('/academico/alunos', alunoFinal);
            } else {
                await api.enviar('/academico/alunos', alunoFinal);
            }
            
            await Registrador.registrar(
                ehEdicao ? 'EDITAR_ALUNO' : 'CRIAR_ALUNO', 
                'aluno', 
                aluno.matricula, 
                { ...alunoFinal, via: 'online_admin' }, 
                ehEdicao ? { ...alunoAnterior } : undefined
            );
            
            log.info(`Aluno ${ehEdicao ? 'atualizado' : 'cadastrado'} online com sucesso`);

            // Notifica o agente local para sincronizar as mudanças
            agenteServico.forcarSincronia().catch(() => {});
        } catch (erro) {
            log.error('Falha ao salvar aluno online', erro);
            throw erro;
        }
    },

    /**
     * Remove um registro de aluno do servidor central.
     * @param matricula - Número de matrícula único do aluno.
     * @throws {Error} Caso falte conexão ou a remoção seja bloqueada pelo servidor.
     */
    async excluirAluno(matricula: string): Promise<void> {
        if (!navigator.onLine) {
            throw new Error('A exclusão de alunos requer conexão ativa com o servidor.');
        }

        try {
            await api.remover(`/academico/alunos?matricula=${matricula}`);
            await Registrador.registrar('DELETAR_ALUNO', 'aluno', matricula, { status: 'online_admin' });
            log.info('Aluno removido do servidor com sucesso');

            // Notifica o agente local para sincronizar as mudanças
            agenteServico.forcarSincronia().catch(() => {});
            
        } catch (erro) {
            log.error('Falha ao remover aluno online', erro);
            throw erro;
        }
    },

    /**
     * Atualiza a enturmação de múltiplos alunos simultaneamente.
     * @param matriculas - Lista de matrículas dos alunos a serem promovidos.
     * @param novaTurmaId - Identificador da nova turma de destino.
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
     * Processa a importação de uma lista de alunos, validando duplicatas localmente antes do envio.
     * @param dados - Array de dados brutos (objetos ou matrizes) vindos da planilha.
     * @param alunosExistentes - Lista atual de alunos para verificação de duplicidade de matrícula.
     * @returns {Promise<ResultadoImportacao>} Resumo do processamento (total, sucessos, erros e detalhes).
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
                
                // Notifica o agente local para sincronizar as mudanças
                agenteServico.forcarSincronia().catch(() => {});
            } catch (erro) {
                log.error('Falha ao importar lote no servidor', erro);
                throw new Error('Falha ao salvar dados no servidor durante a importação.');
            }
        }

        return { total: dados.length, sucessos, erros, detalhes: errosDetalhes };
    }
};
