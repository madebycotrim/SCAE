import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { api } from '@compartilhado/servicos/api';
import { Registrador } from '@compartilhado/servicos/auditoria';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { Aluno, ResultadoImportacao, FiltrosAluno } from '../types/aluno';
import toast from 'react-hot-toast';

const log = criarRegistrador('AlunoServico');

/**
 * Serviço de gerenciamento de Alunos.
 * Centraliza persistência, sincronização e auditoria.
 */
export const alunoServico = {
    /**
     * Busca dados iniciais (alunos e turmas) do banco local.
     */
    async carregarDadosIniciais() {
        try {
            const banco = await bancoLocal.iniciarBanco();
            const [listaAlunos, listaTurmas] = await Promise.all([
                banco.getAll('alunos'),
                banco.getAll('turmas')
            ]);

            listaAlunos.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
            listaTurmas.sort((a, b) => a.id.localeCompare(b.id));

            return { alunos: listaAlunos as Aluno[], turmas: listaTurmas };
        } catch (erro) {
            log.error('Erro ao carregar dados iniciais', erro);
            throw erro;
        }
    },

    /**
     * Salva ou atualiza um aluno.
     * @lgpd Base legal: Execução de contrato (Art. 7º, V)
     */
    async salvarAluno(aluno: Aluno, ehEdicao: boolean): Promise<void> {
        try {
            const banco = await bancoLocal.iniciarBanco();

            if (!ehEdicao) {
                const existente = await banco.get('alunos', aluno.matricula);
                if (existente) {
                    throw new Error('Matrícula já cadastrada!');
                }
            }

            const alunoFinal: Aluno = {
                ...aluno,
                atualizado_em: new Date().toISOString()
            };

            await banco.put('alunos', alunoFinal);

            // Sync se online
            if (navigator.onLine) {
                api.enviar(`/alunos/${aluno.matricula}`, alunoFinal)
                    .catch(e => log.warn('Sincronização em nuvem falhou', e));
            }

            // Auditoria
            const acao = ehEdicao ? 'EDITAR_ALUNO' : 'CRIAR_ALUNO';
            await Registrador.registrar(acao, 'aluno', aluno.matricula, {
                nome: aluno.nome_completo,
                turma: aluno.turma_id,
                ativo: aluno.ativo
            });
        } catch (erro) {
            log.error('Erro ao salvar aluno', erro);
            throw erro;
        }
    },

    /**
     * Remove um aluno do sistema.
     * @lgpd Base legal: Obrigação legal (Art. 7º, II) - Retenção de 5 anos para fins fiscais/acadêmicos.
     */
    async excluirAluno(matricula: string): Promise<void> {
        try {
            const banco = await bancoLocal.iniciarBanco();
            await banco.delete('alunos', matricula);

            // Nota: Exclusão lógica no server deve ser tratada via api.enviar se necessário

            await Registrador.registrar('DELETAR_ALUNO', 'aluno', matricula, {});
        } catch (erro) {
            log.error('Erro ao excluir aluno', erro);
            throw erro;
        }
    },

    /**
     * Promove um lote de alunos para uma nova turma.
     */
    async promoverEmLote(matriculas: string[], novaTurmaId: string): Promise<void> {
        try {
            const banco = await bancoLocal.iniciarBanco();
            const tx = banco.transaction('alunos', 'readwrite');
            const dataAtual = new Date().toISOString();

            for (const matricula of matriculas) {
                const aluno = await tx.store.get(matricula);
                if (aluno) {
                    await tx.store.put({
                        ...aluno,
                        turma_id: novaTurmaId,
                        atualizado_em: dataAtual
                    });
                }
            }
            await tx.done;

            await Registrador.registrar('ALUNOS_PROMOCAO_LOTE', 'aluno', 'LOTE', {
                quantidade: matriculas.length,
                nova_turma: novaTurmaId
            });
        } catch (erro) {
            log.error('Erro na promoção em lote', erro);
            throw erro;
        }
    },

    /**
     * Importa alunos de uma lista de dados (JSON ou Array de Arrays).
     */
    async importarAlunos(dados: any[], alunosExistentes: Aluno[]): Promise<ResultadoImportacao> {
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
                sincronizado: 0
            });
            matriculasExistentes.add(matriculaLimpa);
            sucessos++;
        }

        if (novosAlunos.length > 0) {
            const banco = await bancoLocal.iniciarBanco();
            const tx = banco.transaction('alunos', 'readwrite');
            await Promise.all(novosAlunos.map(a => tx.store.put(a)));
            await tx.done;
        }

        return {
            total: dados.length,
            sucessos,
            erros,
            detalhes: errosDetalhes
        };
    }
};
