import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase, ErroValidacao, ErroNaoEncontrado, ErroPermissao } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../seguranca';
import { esquemaUsuario } from './usuarios.esquemas';

async function processarBuscaUsuarios(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN']);

    const { results } = await contexto.env.DB_SCAE.prepare(
        "SELECT email, escola_id, nome_completo, papel, ativo, criado_por, pendente, criado_em, atualizado_em FROM usuarios WHERE escola_id = ?"
    ).bind(idEscola).all();

    return Response.json({
        dados: results,
        mensagem: 'Lista de usuários carregada com sucesso'
    });
}

async function processarCriacaoUsuario(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN']);

    const corpo = await contexto.request.json();
    const resultadoZod = esquemaUsuario.safeParse(corpo);

    if (!resultadoZod.success) {
        throw new ErroValidacao('Dados do usuário inválidos', 'USER_VALIDACAO_001', { detalhes: resultadoZod.error.format() });
    }

    const { email, papel, ativo, nome_completo, criado_por, pendente, criado_em } = resultadoZod.data;

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

    return Response.json({
        dados: { email },
        mensagem: 'Usuário processado com sucesso'
    });
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
