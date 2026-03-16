import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase, ErroValidacao, ErroNaoEncontrado, ErroPermissao, ErroInterno } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../seguranca';
import { esquemaUsuario } from './usuarios.esquemas';

async function processarBuscaUsuarios(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN']);

        try {
            const { results } = await contexto.env.DB_SCAE.prepare(
                "SELECT email, escola_id, nome_completo, papel, ativo, criado_por, pendente, criado_em, atualizado_em FROM usuarios WHERE escola_id = ?"
            ).bind(idEscola).all();

            return Response.json({
                dados: results,
                mensagem: 'Lista de usuários carregada com sucesso'
            });
        } catch (dbError) {
            throw new ErroInterno(`Falha ao buscar usuários: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar usuários');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

async function processarCriacaoUsuario(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN']);

        let corpo;
        try {
            corpo = await contexto.request.json();
        } catch (parseError) {
            throw new ErroValidacao('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR');
        }

        const resultadoZod = esquemaUsuario.safeParse(corpo);

        if (!resultadoZod.success) {
            throw new ErroValidacao('Dados do usuário inválidos', 'USER_VALIDACAO_001', { detalhes: resultadoZod.error.format() });
        }

        const { email, papel, ativo, nome_completo, criado_por, pendente, criado_em } = resultadoZod.data;

        try {
            await contexto.env.DB_SCAE.prepare(
                `INSERT INTO usuarios (email, escola_id, papel, ativo, nome_completo, criado_por, pendente, criado_em, atualizado_em)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(email, escola_id) DO UPDATE SET
                    papel = excluded.papel,
                    ativo = excluded.ativo,
                    nome_completo = excluded.nome_completo,
                    pendente = excluded.pendente,
                    atualizado_em = CURRENT_TIMESTAMP`
            ).bind(
                email,
                idEscola,
                papel || 'PORTEIRO',
                ativo ? 1 : 0,
                nome_completo,
                criado_por ?? contexto.data.user?.email,
                pendente ? 1 : 0,
                criado_em || new Date().toISOString(),
                new Date().toISOString()
            ).run();
        } catch (dbError) {
            throw new ErroInterno(`Falha ao inserir usuário: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }

        return Response.json({
            dados: { email },
            mensagem: 'Usuário processado com sucesso'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao criar usuário');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

async function processarRemocaoUsuario(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN']);

    const url = new URL(contexto.request.url);
    const email = url.searchParams.get("email");

    if (!email) {
        throw new ErroValidacao('E-mail obrigatório para remoção', 'USER_ID_AUSENTE');
    }

    if (email === contexto.data.user?.email) {
        throw new ErroPermissao('Você não pode remover seu próprio acesso administrativo');
    }

    const resultado = await contexto.env.DB_SCAE.prepare(
        "DELETE FROM usuarios WHERE email = ? AND escola_id = ?"
    ).bind(email, idEscola).run();

    if (resultado.meta.changes === 0) {
        throw new ErroNaoEncontrado('Usuário não encontrado para exclusão');
    }

    return Response.json({
        mensagem: 'Usuário removido com sucesso'
    });
}

export {
    processarBuscaUsuarios as onRequestGet,
    processarCriacaoUsuario as onRequestPost,
    processarRemocaoUsuario as onRequestDelete
};
