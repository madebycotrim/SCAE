import { ErroBase, ErroInterno } from '../erros';
import { ContextoSCAE } from '../../tipos/ambiente';
import { verificarPermissao } from '../_seguranca';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        // RBAC: Apenas CENTRAL pode listar todos os usuários globalmente
        verificarPermissao(contexto, ['CENTRAL']);

        const { results } = await contexto.env.DB_SCAE.prepare(
            `SELECT
                u.email,
                u.escola_id,
                u.nome_completo,
                u.papel,
                u.ativo,
                u.pendente,
                u.criado_por,
                u.criado_em,
                u.atualizado_em,
                e.nome_escola
             FROM usuarios u
             LEFT JOIN escolas e ON u.escola_id = e.id
             ORDER BY u.criado_em DESC
             LIMIT 200`
        ).all();

        return Response.json({
            dados: results,
            mensagem: 'Usuários carregados com sucesso'
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Falha ao buscar contas de usuários');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
