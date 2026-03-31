import type { ContextoCatraki } from '../../tipos/ambiente';
import { ErroBase, ErroValidacao, ErroNaoEncontrado, ErroInterno } from '../erros';
import { verificarAcesso, extrairEscolaId } from '../_seguranca';
import { Permissao } from '../seguranca/rbac';
import { esquemaEquipe } from './equipes.esquemas';

/**
 * GET — Lista as equipes da escola.
 */
async function listarEquipes(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.VER_ACADEMICO);

        try {
            const { results } = await contexto.env.DB_CATRAKI.prepare(
                `SELECT 
                    e.id, e.nome_equipe, e.cor, e.tts_alias, e.criado_em,
                    (SELECT COUNT(*) FROM aluno_equipe ae WHERE ae.equipe_id = e.id AND ae.escola_id = e.escola_id) as totalAlunos,
                    (SELECT COUNT(*) FROM grupos_equipe ge WHERE ge.equipe_id = e.id AND ge.escola_id = e.escola_id) as totalGrupos
                FROM equipes e 
                WHERE e.escola_id = ? 
                ORDER BY e.nome_equipe`
            ).bind(idEscola).all();

            return Response.json({
                dados: results,
                mensagem: 'Lista de equipes carregada com sucesso'
            });
        } catch (dbError) {
            throw new ErroInterno(`Falha ao buscar equipes: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status });
        }
        return Response.json(new ErroInterno().toJSON(), { status: 500 });
    }
}

/**
 * POST — Cria ou atualiza uma equipe.
 */
async function salvarEquipe(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.GERENCIAR_ACADEMICO);

        const corpo = await contexto.request.json().catch(() => {
            throw new ErroValidacao('JSON inválido');
        });

        const resultadoZod = esquemaEquipe.safeParse(corpo);
        if (!resultadoZod.success) {
            throw new ErroValidacao('Dados da equipe inválidos', 'EQUIPE_VALIDACAO_001', { detalhes: resultadoZod.error.format() });
        }

        const { id, nome_equipe, cor, tts_alias, criado_em } = resultadoZod.data;

        try {
            await contexto.env.DB_CATRAKI.prepare(
                `INSERT INTO equipes (id, escola_id, nome_equipe, cor, tts_alias, criado_em, atualizado_em) 
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(id, escola_id) DO UPDATE SET
                    nome_equipe = excluded.nome_equipe,
                    cor = excluded.cor,
                    tts_alias = excluded.tts_alias,
                    atualizado_em = CURRENT_TIMESTAMP`
            ).bind(
                id, idEscola, nome_equipe, cor || '#4F46E5', tts_alias || null, criado_em || new Date().toISOString()
            ).run();
        } catch (dbError) {
            throw new ErroInterno(`Falha ao salvar equipe: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }

        return Response.json({
            dados: { id },
            mensagem: 'Equipe salva com sucesso'
        }, { status: 201 });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status });
        }
        return Response.json(new ErroInterno().toJSON(), { status: 500 });
    }
}

/**
 * DELETE — Remove uma equipe.
 */
async function removerEquipe(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.GERENCIAR_ACADEMICO);

        const url = new URL(contexto.request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            throw new ErroValidacao('ID da equipe obrigatório');
        }

        try {
            // A FK com ON DELETE CASCADE deve lidar com os grupos e vínculos se configurado corretamente no SQLite,
            // mas o D1 as vezes exige cuidado extra dependendo de como as constraints são tratadas.
            const resultado = await contexto.env.DB_CATRAKI.prepare(
                "DELETE FROM equipes WHERE id = ? AND escola_id = ?"
            ).bind(id, idEscola).run();

            if (resultado.meta.changes === 0) {
                throw new ErroNaoEncontrado('Equipe não encontrada para exclusão');
            }
        } catch (dbError) {
            if (dbError instanceof ErroBase) throw dbError;
            throw new ErroInterno(`Falha ao remover equipe: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }

        return Response.json({
            mensagem: 'Equipe removida com sucesso'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status });
        }
        return Response.json(new ErroInterno().toJSON(), { status: 500 });
    }
}

export {
    listarEquipes as onRequestGet,
    salvarEquipe as onRequestPost,
    removerEquipe as onRequestDelete
};
