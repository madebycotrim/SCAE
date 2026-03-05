import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase, ErroValidacao, ErroNaoEncontrado } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../seguranca';
import { esquemaTurma } from './turmas.esquemas';

async function processarBuscaTurmas(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTEIRO']);

    const { results } = await contexto.env.DB_SCAE.prepare(
        "SELECT id, escola_id, serie, letra, turno, ano_letivo, criado_em FROM turmas WHERE escola_id = ? ORDER BY id"
    ).bind(idEscola).all();

    return Response.json({
        dados: results,
        mensagem: 'Lista de turmas carregada com sucesso'
    });
}

async function processarCriacaoTurma(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA']);

    const corpo = await contexto.request.json();
    const resultadoZod = esquemaTurma.safeParse(corpo);

    if (!resultadoZod.success) {
        throw new ErroValidacao('Dados da turma inválidos', 'TURMA_VALIDACAO_001', { detalhes: resultadoZod.error.format() });
    }

    const { id, serie, letra, turno, ano_letivo, criado_em } = resultadoZod.data;

    // UPSERT
    await contexto.env.DB_SCAE.prepare(
        `INSERT INTO turmas (id, escola_id, serie, letra, turno, ano_letivo, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id, escola_id) DO UPDATE SET
            serie = excluded.serie,
            letra = excluded.letra,
            turno = excluded.turno,
            ano_letivo = excluded.ano_letivo`
    ).bind(id, idEscola, serie ?? null, letra ?? null, turno ?? null, ano_letivo ?? null, criado_em || new Date().toISOString()).run();

    return Response.json({
        dados: { id },
        mensagem: 'Turma processada com sucesso'
    }, { status: 201 });
}

async function processarRemocaoTurma(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN']);

    const url = new URL(contexto.request.url);
    const id = url.searchParams.get("id");

    if (!id) {
        throw new ErroValidacao('ID da turma obrigatório para remoção', 'TURMA_ID_AUSENTE');
    }

    const resultado = await contexto.env.DB_SCAE.prepare(
        "DELETE FROM turmas WHERE id = ? AND escola_id = ?"
    ).bind(id, idEscola).run();

    if (resultado.meta.changes === 0) {
        throw new ErroNaoEncontrado('Turma não encontrada para exclusão');
    }

    return Response.json({
        mensagem: 'Turma removida com sucesso'
    });
}

// Exportações com Alias para o Framework
export {
    processarBuscaTurmas as onRequestGet,
    processarCriacaoTurma as onRequestPost,
    processarRemocaoTurma as onRequestDelete
};
