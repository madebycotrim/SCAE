/**
 * Worker CRUD de Usuários (RBAC).
 * GET: Todos os usuários do tenant
 * POST: UPSERT usuário (email + escola_id)
 * DELETE: Remover usuário por email
 */
import type { ContextoSCAE, PayloadCriacaoUsuario } from '../tipos/ambiente';

async function processarBuscaUsuarios(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = contexto.request.headers.get('X-Escola-ID');
        if (!idEscola) return new Response("escola_id ausente", { status: 400 });

        // RBAC: Apenas ADMIN
        const papel = contexto.data.usuarioScae?.papel;
        const eDono = contexto.data.user?.email === 'madebycotrim@gmail.com';

        if (papel !== 'ADMIN' && !eDono) {
            return new Response("Acesso negado: Apenas administradores podem gerenciar usuários", { status: 403 });
        }

        const { results } = await contexto.env.DB_SCAE.prepare(
            "SELECT email, escola_id, nome_completo, papel, ativo, criado_por, pendente, criado_em, atualizado_em, data_exclusao FROM usuarios WHERE escola_id = ?"
        ).bind(idEscola).all();
        return Response.json(results);
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarCriacaoUsuario(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = contexto.request.headers.get('X-Escola-ID');
        if (!idEscola) return new Response("escola_id ausente", { status: 400 });

        // RBAC: Apenas ADMIN
        const papel = contexto.data.usuarioScae?.papel;
        const eDono = contexto.data.user?.email === 'madebycotrim@gmail.com';

        if (papel !== 'ADMIN' && !eDono) {
            return new Response("Acesso negado: Apenas administradores podem gerenciar usuários", { status: 403 });
        }

        const usuario: PayloadCriacaoUsuario = await contexto.request.json();

        if (!usuario.email) {
            return new Response("Email obrigatório", { status: 400 });
        }

        const stmt = contexto.env.DB_SCAE.prepare(
            `INSERT INTO usuarios (email, escola_id, papel, ativo, nome_completo, criado_por, pendente, criado_em, atualizado_em)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(email, escola_id) DO UPDATE SET
             papel = excluded.papel,
             ativo = excluded.ativo,
             nome_completo = excluded.nome_completo,
             pendente = excluded.pendente,
             atualizado_em = CURRENT_TIMESTAMP`
        );

        await stmt.bind(
            usuario.email,
            idEscola,
            usuario.papel || usuario.role,
            usuario.ativo ? 1 : 0,
            usuario.nome_completo ?? null,
            usuario.criado_por ?? null,
            usuario.pendente ? 1 : 0,
            usuario.criado_em || new Date().toISOString(),
            new Date().toISOString()
        ).run();

        return new Response("Usuário salvo/atualizado", { status: 200 });
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarRemocaoUsuario(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = contexto.request.headers.get('X-Escola-ID');
        if (!idEscola) return new Response("escola_id ausente", { status: 400 });

        // RBAC: Apenas ADMIN
        const papel = contexto.data.usuarioScae?.papel;
        const eDono = contexto.data.user?.email === 'madebycotrim@gmail.com';

        if (papel !== 'ADMIN' && !eDono) {
            return new Response("Acesso negado: Apenas administradores podem gerenciar usuários", { status: 403 });
        }

        const url = new URL(contexto.request.url);
        const email = url.searchParams.get("email");

        if (!email) {
            return new Response("Email obrigatório", { status: 400 });
        }

        // Impedir auto-exclusão acidental do admin principal (opcional mas seguro)
        if (email === contexto.data.user?.email) {
            return new Response("Ação negada: Você não pode remover seu próprio acesso administrativo", { status: 400 });
        }

        await contexto.env.DB_SCAE.prepare(
            "DELETE FROM usuarios WHERE email = ? AND escola_id = ?"
        ).bind(email, idEscola).run();

        return new Response("Usuário removido", { status: 200 });
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

export {
    processarBuscaUsuarios as onRequestGet,
    processarCriacaoUsuario as onRequestPost,
    processarRemocaoUsuario as onRequestDelete
};
