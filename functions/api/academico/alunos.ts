import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase, ErroValidacao, ErroNaoEncontrado, ErroInterno } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../_seguranca';
import { esquemaAluno } from './alunos.esquemas';

async function processarBuscaAlunos(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA']);

        const { searchParams } = new URL(contexto.request.url);
        const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1', 10) || 1);
        const porPagina = Math.min(200, Math.max(1, parseInt(searchParams.get('limite') || '50', 10) || 50));
        const offset = (pagina - 1) * porPagina;

        // Buscar total + dados em batch (1 round-trip ao D1)
        const [countResult, dataResult] = await contexto.env.DB_SCAE.batch([
            contexto.env.DB_SCAE.prepare(
                "SELECT COUNT(*) as total FROM alunos WHERE escola_id = ?"
            ).bind(idEscola),
            contexto.env.DB_SCAE.prepare(
                "SELECT matricula, escola_id, nome_completo, turma_id, data_nascimento, ativo, criado_em, atualizado_em FROM alunos WHERE escola_id = ? ORDER BY nome_completo ASC LIMIT ? OFFSET ?"
            ).bind(idEscola, porPagina, offset)
        ]);

        const total = (countResult.results[0] as { total: number })?.total || 0;

        return Response.json({
            dados: dataResult.results,
            meta: {
                total,
                pagina,
                porPagina,
                totalPaginas: Math.ceil(total / porPagina)
            },
            mensagem: 'Lista de alunos carregada com sucesso'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar alunos');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

async function processarCriacaoAluno(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA']);

        let corpo;
        try {
            corpo = await contexto.request.json();
        } catch {
            throw new ErroValidacao('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR');
        }

        const resultadoZod = esquemaAluno.safeParse(corpo);

        if (!resultadoZod.success) {
            throw new ErroValidacao('Dados do aluno inválidos', 'ALUNO_VALIDACAO_001', { detalhes: resultadoZod.error.format() });
        }

        const { matricula, nome_completo, turma_id, data_nascimento, ativo } = resultadoZod.data;

        try {
            // UPSERT: Inserir ou Atualizar Aluno
            await contexto.env.DB_SCAE.prepare(
                `INSERT INTO alunos (matricula, escola_id, nome_completo, turma_id, data_nascimento, ativo) VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(matricula, escola_id) DO UPDATE SET
                    nome_completo = excluded.nome_completo,
                    turma_id = excluded.turma_id,
                    data_nascimento = excluded.data_nascimento,
                    ativo = excluded.ativo,
                    atualizado_em = CURRENT_TIMESTAMP`
            ).bind(matricula, idEscola, nome_completo, turma_id ?? null, data_nascimento ?? null, ativo ? 1 : 0).run();
        } catch (dbError) {
            throw new ErroInterno(`Falha ao inserir aluno: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }

        return Response.json({
            dados: { matricula },
            mensagem: 'Aluno processado com sucesso'
        }, { status: 201 });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao criar aluno');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

async function processarRemocaoAluno(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN']);

        const url = new URL(contexto.request.url);
        const matricula = url.searchParams.get("matricula");

        if (!matricula) {
            throw new ErroValidacao('Matrícula obrigatória para remoção', 'ALUNO_ID_AUSENTE');
        }

        try {
            const resultado = await contexto.env.DB_SCAE.prepare(
                "DELETE FROM alunos WHERE matricula = ? AND escola_id = ?"
            ).bind(matricula, idEscola).run();

            if (resultado.meta.changes === 0) {
                throw new ErroNaoEncontrado('Aluno não encontrado para exclusão');
            }
        } catch (dbError) {
            if (dbError instanceof ErroBase) throw dbError;
            throw new ErroInterno(`Falha ao remover aluno: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }

        return Response.json({
            mensagem: 'Aluno removido com sucesso'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao remover aluno');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

// Exportações com Alias para o Framework
export {
    processarBuscaAlunos as onRequestGet,
    processarCriacaoAluno as onRequestPost,
    processarRemocaoAluno as onRequestDelete
};
