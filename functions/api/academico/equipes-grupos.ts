import type { ContextoCatraki } from '../../tipos/ambiente';
import { ErroBase, ErroValidacao, ErroNaoEncontrado, ErroInterno } from '../erros';
import { verificarAcesso, extrairEscolaId } from '../_seguranca';
import { Permissao } from '../seguranca/rbac';
import { esquemaGrupoEquipe } from './equipes.esquemas';
// Utilizando crypto.randomUUID() nativo do Cloudflare Workers

/**
 * GET — Lista os grupos de uma equipe.
 */
async function listarGrupos(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.VER_ACADEMICO);

        const url = new URL(contexto.request.url);
        const equipeId = url.searchParams.get("equipe_id");

        if (!equipeId) {
            throw new ErroValidacao('equipe_id é obrigatório para listar grupos');
        }

        try {
            const { results } = await contexto.env.DB_CATRAKI.prepare(
                `SELECT 
                    g.id, g.equipe_id, g.nome_grupo, g.escala_tipo, g.escala_dias, g.criado_em,
                    (SELECT COUNT(*) FROM aluno_equipe ae WHERE ae.grupo_id = g.id AND ae.escola_id = g.escola_id) as totalAlunos
                FROM grupos_equipe g 
                WHERE g.escola_id = ? AND g.equipe_id = ?
                ORDER BY g.nome_grupo`
            ).bind(idEscola, equipeId).all();

            return Response.json({
                dados: results,
                mensagem: 'Lista de grupos carregada com sucesso'
            });
        } catch (dbError) {
            throw new ErroInterno(`Falha ao buscar grupos: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status });
        }
        return Response.json(new ErroInterno().toJSON(), { status: 500 });
    }
}

/**
 * POST — Cria ou atualiza um grupo de equipe.
 */
async function salvarGrupo(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.GERENCIAR_ACADEMICO);

        const corpo = await contexto.request.json().catch(() => {
            throw new ErroValidacao('JSON inválido');
        });

        const resultadoZod = esquemaGrupoEquipe.safeParse(corpo);
        if (!resultadoZod.success) {
            throw new ErroValidacao('Dados do grupo inválidos', 'GRUPO_VALIDACAO_001', { detalhes: resultadoZod.error.format() });
        }

        const { id, equipe_id, nome_grupo, escala_tipo, escala_dias, criado_em } = resultadoZod.data;
        const idGrupo = id || crypto.randomUUID();

        try {
            await contexto.env.DB_CATRAKI.prepare(
                `INSERT INTO grupos_equipe (id, escola_id, equipe_id, nome_grupo, escala_tipo, escala_dias, criado_em, atualizado_em) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(id, escola_id) DO UPDATE SET
                    equipe_id = excluded.equipe_id,
                    nome_grupo = excluded.nome_grupo,
                    escala_tipo = excluded.escala_tipo,
                    escala_dias = excluded.escala_dias,
                    atualizado_em = CURRENT_TIMESTAMP`
            ).bind(
                idGrupo, idEscola, equipe_id, nome_grupo, escala_tipo, escala_dias, criado_em || new Date().toISOString()
            ).run();
        } catch (dbError) {
            throw new ErroInterno(`Falha ao salvar grupo: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }

        return Response.json({
            dados: { id: idGrupo },
            mensagem: 'Grupo salvo com sucesso'
        }, { status: 201 });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status });
        }
        return Response.json(new ErroInterno().toJSON(), { status: 500 });
    }
}

/**
 * DELETE — Remove um grupo de equipe.
 */
async function removerGrupo(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.GERENCIAR_ACADEMICO);

        const url = new URL(contexto.request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            throw new ErroValidacao('ID do grupo obrigatório');
        }

        try {
            const resultado = await contexto.env.DB_CATRAKI.prepare(
                "DELETE FROM grupos_equipe WHERE id = ? AND escola_id = ?"
            ).bind(id, idEscola).run();

            if (resultado.meta.changes === 0) {
                throw new ErroNaoEncontrado('Grupo não encontrado para exclusão');
            }
        } catch (dbError) {
            if (dbError instanceof ErroBase) throw dbError;
            throw new ErroInterno(`Falha ao remover grupo: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }

        return Response.json({
            mensagem: 'Grupo removido com sucesso'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status });
        }
        return Response.json(new ErroInterno().toJSON(), { status: 500 });
    }
}

export {
    listarGrupos as onRequestGet,
    salvarGrupo as onRequestPost,
    removerGrupo as onRequestDelete
};
