import { ErroBase, ErroInterno } from '../erros';
import { ContextoSCAE } from '../../tipos/ambiente';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        const usuarios = await contexto.env.DB_SCAE.prepare(
            `SELECT
                u.id,
                u.email,
                u.nome,
                u.papel,
                t.nome_escola,
                u.criado_em as ultimoAcesso -- Placeholder para último acesso real
             FROM usuarios u
             LEFT JOIN escolas t ON u.escola_id = t.id
             ORDER BY u.criado_em DESC`
        ).all();

        return Response.json({ dados: usuarios.results }, {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (erro) {
        console.error('Erro ao listar usuários globalmente:', erro);
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Falha ao buscar contas de usuários');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

