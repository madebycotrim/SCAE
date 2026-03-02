/**
 * Worker CRUD de Usuários (RBAC).
 * GET: Todos os usuários do tenant
 * POST: UPSERT usuário (email + tenant_id)
 * DELETE: Remover usuário por email
 */
import type { ContextoSCAE, PayloadCriacaoUsuario } from '../types/ambiente';

async function processarBuscaUsuarios(contexto: ContextoSCAE): Promise<Response> {
    try {
        const tenantId = contexto.request.headers.get('X-Tenant-ID');
        if (!tenantId) return new Response("Tenant_id ausente", { status: 400 });

        const { results } = await contexto.env.DB_SCAE.prepare(
            "SELECT * FROM usuarios WHERE tenant_id = ?"
        ).bind(tenantId).all();
        return Response.json(results);
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarCriacaoUsuario(contexto: ContextoSCAE): Promise<Response> {
    try {
        const tenantId = contexto.request.headers.get('X-Tenant-ID');
        if (!tenantId) return new Response("Tenant_id ausente", { status: 400 });

        const usuario: PayloadCriacaoUsuario = await contexto.request.json();

        // Validação básica
        if (!usuario.email) {
            return new Response("Email obrigatório", { status: 400 });
        }

        // Tenta inserir ou atualizar
        const stmt = contexto.env.DB_SCAE.prepare(
            `INSERT INTO usuarios (email, tenant_id, papel, ativo, nome_completo, data_criacao, data_atualizacao) 
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(email, tenant_id) DO UPDATE SET 
             papel = excluded.papel, 
             ativo = excluded.ativo,
             data_atualizacao = excluded.data_atualizacao`
        );

        await stmt.bind(
            usuario.email,
            tenantId,
            usuario.papel || usuario.role,
            usuario.ativo ? 1 : 0,
            usuario.nome_completo ?? null,
            usuario.criado_em || new Date().toISOString(),
            usuario.atualizado_em || new Date().toISOString()
        ).run();

        return new Response("Usuário salvo/atualizado", { status: 200 });
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarRemocaoUsuario(contexto: ContextoSCAE): Promise<Response> {
    try {
        const tenantId = contexto.request.headers.get('X-Tenant-ID');
        if (!tenantId) return new Response("Tenant_id ausente", { status: 400 });

        const url = new URL(contexto.request.url);
        const email = url.searchParams.get("email");

        if (!email) {
            return new Response("Email obrigatório", { status: 400 });
        }

        await contexto.env.DB_SCAE.prepare(
            "DELETE FROM usuarios WHERE email = ? AND tenant_id = ?"
        ).bind(email, tenantId).run();

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
