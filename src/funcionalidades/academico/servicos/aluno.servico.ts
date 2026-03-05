import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { api } from '@compartilhado/servicos/api';
import { Registrador } from '@compartilhado/servicos/auditoria';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { Aluno, ResultadoImportacao, FiltrosAluno } from '../tipos/academico';
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
     * @lgpd Base legal: Execução de contrato (Art. 7Âº, V)
     */
    async salvarAluno(aluno: Aluno, ehEdicao: boolean): Promise<void> {
        const alunoFinal: Aluno = {
            ...aluno,
            atualizado_em: new Date().toISOString(),
            sincronizado: 1 // Assume sucesso online inicialmente
        };

        try {
            // 1. Tentar salvar no servidor primeiro (Online-First)
            if (navigator.onLine) {
                await api.enviar(`/academico/alunos/${aluno.matricula}`, alunoFinal);
                log.info('Aluno salvo online com sucesso');
            } else {
                throw new Error('Offline: Salvando localmente');
            }
        } catch (erro) {
            log.warn('Falha ao salvar online, recorrendo ao banco local', erro);
            alunoFinal.sincronizado = 0; // Marcar para sincronização posterior
        }

        try {
            // 2. Persistir localmente como garantia (ou como única via se offline)
            const banco = await bancoLocal.iniciarBanco();

            if (!ehEdicao && alunoFinal.sincronizado === 0) {
                const existente = await banco.get('alunos', aluno.matricula);
                if (existente) throw new Error('Matrícula já cadastrada localmente!');
            }

            await banco.put('alunos', alunoFinal);

            // 3. Auditoria
            const acao = ehEdicao ? 'EDITAR_ALUNO' : 'CRIAR_ALUNO';
            await Registrador.registrar(acao, 'aluno', aluno.matricula, {
                nome: aluno.nome_completo,
                turma: aluno.turma_id,
                ativo: aluno.ativo,
                via: alunoFinal.sincronizado ? 'online' : 'local'
            });

            if (alunoFinal.sincronizado === 0 && navigator.onLine) {
                toast.success('Salvo localmente (Sincronização pendente)');
            }
        } catch (erroLocal) {
            log.error('Erro crítico ao persistir aluno', erroLocal);
            throw erroLocal;
        }
    },

    /**
     * Remove um aluno do sistema.
     * @lgpd Base legal: Obrigação legal (Art. 7Âº, II) - Retenção de 5 anos para fins fiscais/acadêmicos.
     */
    async excluirAluno(matricula: string): Promise<void> {
        let removidoOnline = false;
        try {
            // 1. Tentar remover do servidor primeiro
            if (navigator.onLine) {
                await api.remover(`/academico/alunos?matricula=${matricula}`);
                removidoOnline = true;
            }
        } catch (erro) {
            log.warn('Falha ao remover online, agendando para depois', erro);
            // Registrar pendência no banco local para o Sync processar depois
            await bancoLocal.adicionarPendencia('DELETE', 'alunos', matricula);
        }

        try {
            // 2. Remover localmente
            const banco = await bancoLocal.iniciarBanco();
            await banco.delete('alunos', matricula);

            await Registrador.registrar('DELETAR_ALUNO', 'aluno', matricula, { status: removidoOnline ? 'online' : 'pendente' });
        } catch (erroLocal) {
            log.error('Erro ao excluir aluno localmente', erroLocal);
            throw erroLocal;
        }
    },

    /**
     * Promove um lote de alunos para uma nova turma.
     */
    async promoverEmLote(matriculas: string[], novaTurmaId: string): Promise<void> {
        let sucessoOnline = false;
        const dataAtual = new Date().toISOString();

        try {
            // 1. Tentar promoção no servidor primeiro
            if (navigator.onLine) {
                await api.enviar('/academico/alunos/lote/promocao', { matriculas, nova_turma: novaTurmaId });
                sucessoOnline = true;
                log.info('Promoção em lote realizada online');
            }
        } catch (erro) {
            log.warn('Falha na promoção online, aplicando localmente para sync posterior', erro);
        }

        try {
            // 2. Aplicar localmente
            const banco = await bancoLocal.iniciarBanco();
            const tx = banco.transaction('alunos', 'readwrite');

            for (const matricula of matriculas) {
                const aluno = await tx.store.get(matricula);
                if (aluno) {
                    await tx.store.put({
                        ...aluno,
                        turma_id: novaTurmaId,
                        atualizado_em: dataAtual,
                        sincronizado: sucessoOnline ? 1 : 0
                    });
                }
            }
            await tx.done;

            await Registrador.registrar('ALUNOS_PROMOCAO_LOTE', 'aluno', 'LOTE', {
                quantidade: matriculas.length,
                nova_turma: novaTurmaId,
                via: sucessoOnline ? 'online' : 'local'
            });

            if (!sucessoOnline && navigator.onLine) {
                toast.success('Promovido localmente (Sincronização pendente)');
            }
        } catch (erroLocal) {
            log.error('Erro na promoção em lote local', erroLocal);
            throw erroLocal;
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

