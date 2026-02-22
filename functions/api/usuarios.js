
async function processarBuscaUsuarios(contexto) {
    try {
        const { results } = await contexto.env.DB_SCAE.prepare(
            "SELECT * FROM usuarios"
        ).all();
        return Response.json(results);
    } catch (erro) {
        return new Response(erro.message, { status: 500 });
    }
}

async function processarCriacaoUsuario(contexto) {
    try {
        const usuario = await contexto.request.json();

        // Validação básica
        if (!usuario.email) {
            return new Response("Email obrigatório", { status: 400 });
        }

        // Tenta inserir ou atualizar
        const stmt = contexto.env.DB_SCAE.prepare(
            `INSERT INTO usuarios (email, papel, ativo, nome_completo, criado_em, atualizado_em) 
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(email) DO UPDATE SET 
             papel = excluded.papel, 
             ativo = excluded.ativo,
             atualizado_em = excluded.atualizado_em`
        );

        await stmt.bind(
            usuario.email,
            usuario.papel || usuario.role, // 'papel' no bancoLocal, 'role' pode vir de outros lugares
            usuario.ativo ? 1 : 0,
            usuario.nome_completo,
            usuario.criado_em,
            usuario.atualizado_em || new Date().toISOString()
        ).run();

        return new Response("Usuário salvo/atualizado", { status: 200 });
    } catch (erro) {
        // Se a tabela não existir, retornará erro 500 JSON, o que é melhor que HTML
        return new Response(erro.message, { status: 500 });
    }
}

async function processarRemocaoUsuario(contexto) {
    try {
        const url = new URL(contexto.request.url);
        const email = url.searchParams.get("email");

        if (!email) {
            return new Response("Email obrigatório", { status: 400 });
        }

        await contexto.env.DB_SCAE.prepare(
            "DELETE FROM usuarios WHERE email = ?"
        ).bind(email).run();

        return new Response("Usuário removido", { status: 200 });
    } catch (erro) {
        return new Response(erro.message, { status: 500 });
    }
}

export {
    processarBuscaUsuarios as onRequestGet,
    processarCriacaoUsuario as onRequestPost,
    processarRemocaoUsuario as onRequestDelete
};
