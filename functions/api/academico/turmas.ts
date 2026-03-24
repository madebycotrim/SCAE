import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase, ErroValidacao, ErroNaoEncontrado, ErroInterno } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../_seguranca';
import { esquemaTurma } from './turmas.esquemas';

async function processarBuscaTurmas(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTEIRO']);

        try {
            const { results } = await contexto.env.DB_SCAE.prepare(
                `SELECT 
                    t.id, t.escola_id, t.ano_letivo, t.serie, t.letra, t.turno,
                    t.sala, t.professor_regente, t.sincronizado, t.criado_em,
                    (SELECT COUNT(*) FROM alunos a WHERE a.turma_id = t.id AND a.escola_id = t.escola_id AND a.ativo = 1) as totalAlunos
                FROM turmas t 
                WHERE t.escola_id = ? 
                ORDER BY t.id`
            ).bind(idEscola).all();

            return Response.json({
                dados: results,
                mensagem: 'Lista de turmas carregada com sucesso'
            });
        } catch (dbError) {
            throw new ErroInterno(`Falha ao buscar turmas: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar turmas');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

async function processarCriacaoTurma(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA']);

        let corpo;
        try {
            corpo = await contexto.request.json();
        } catch (parseError) {
            throw new ErroValidacao('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR');
        }

        const resultadoZod = esquemaTurma.safeParse(corpo);

        if (!resultadoZod.success) {
            throw new ErroValidacao('Dados da turma inválidos', 'TURMA_VALIDACAO_001', { detalhes: resultadoZod.error.format() });
        }

        const { id, serie, letra, turno, ano_letivo, professor_regente, sala, lotacao_maxima, criado_em } = resultadoZod.data;

        try {
            // UPSERT
            await contexto.env.DB_SCAE.prepare(
                `INSERT INTO turmas (id, escola_id, serie, letra, turno, ano_letivo, professor_regente, sala, lotacao_maxima, criado_em) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id, escola_id) DO UPDATE SET
                    serie = excluded.serie,
                    letra = excluded.letra,
                    turno = excluded.turno,
                    ano_letivo = excluded.ano_letivo,
                    professor_regente = excluded.professor_regente,
                    sala = excluded.sala,
                    lotacao_maxima = excluded.lotacao_maxima`
            ).bind(
                id, idEscola, serie ?? null, letra ?? null, turno ?? null, ano_letivo ?? null, 
                professor_regente ?? null, sala ?? null, lotacao_maxima ?? 40, criado_em || new Date().toISOString()
            ).run();
        } catch (dbError) {
            throw new ErroInterno(`Falha ao inserir turma: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }

        return Response.json({
            dados: { id },
            mensagem: 'Turma processada com sucesso'
        }, { status: 201 });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao criar turma');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

async function processarRemocaoTurma(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN']);

        const url = new URL(contexto.request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            throw new ErroValidacao('ID da turma obrigatório para remoção', 'TURMA_ID_AUSENTE');
        }

        try {
            // Remover vínculo dos alunos antes de excluir (Evita FOREIGN KEY constraint SQLITE_CONSTRAINT)
            await contexto.env.DB_SCAE.prepare(
                "UPDATE alunos SET turma_id = NULL WHERE turma_id = ? AND escola_id = ?"
            ).bind(id, idEscola).run();

            const resultado = await contexto.env.DB_SCAE.prepare(
                "DELETE FROM turmas WHERE id = ? AND escola_id = ?"
            ).bind(id, idEscola).run();

            if (resultado.meta.changes === 0) {
                throw new ErroNaoEncontrado('Turma não encontrada para exclusão');
            }
        } catch (dbError) {
            if (dbError instanceof ErroBase) throw dbError;
            throw new ErroInterno(`Falha ao remover turma: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }

        return Response.json({
            mensagem: 'Turma removida com sucesso'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao remover turma');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

// Exportações com Alias para o Framework
export {
    processarBuscaTurmas as onRequestGet,
    processarCriacaoTurma as onRequestPost,
    processarRemocaoTurma as onRequestDelete
};
