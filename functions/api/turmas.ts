/**
 * Worker CRUD de Turmas.
 * GET: Todas as turmas do tenant
 * POST: UPSERT turma (id + tenant_id)
 * DELETE: Remover turma por ID
 */
import type { ContextoSCAE, PayloadCriacaoTurma } from '../types/ambiente';

async function processarBuscaTurmas(contexto: ContextoSCAE): Promise<Response> {
    try {
        const tenantId = contexto.request.headers.get('X-Tenant-ID');
        if (!tenantId) return new Response("Tenant_id ausente", { status: 400 });

        const { results } = await contexto.env.DB_SCAE.prepare(
            "SELECT * FROM turmas WHERE tenant_id = ? ORDER BY id"
        ).bind(tenantId).all();

        return Response.json(results);
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarCriacaoTurma(contexto: ContextoSCAE): Promise<Response> {
    try {
        const tenantId = contexto.request.headers.get('X-Tenant-ID');
        if (!tenantId) return new Response("Tenant_id ausente", { status: 400 });

        const { id, serie, letra, turno, ano_letivo, criado_em }: PayloadCriacaoTurma = await contexto.request.json();

        if (!id) {
            return new Response("ID da turma obrigatório", { status: 400 });
        }

        // UPSERT
        await contexto.env.DB_SCAE.prepare(
            `INSERT INTO turmas (id, tenant_id, serie, letra, turno, ano_letivo, data_criacao) VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id, tenant_id) DO UPDATE SET
             serie = excluded.serie,
             letra = excluded.letra,
             turno = excluded.turno,
             ano_letivo = excluded.ano_letivo`
        ).bind(id, tenantId, serie ?? null, letra ?? null, turno ?? null, ano_letivo ?? null, criado_em || new Date().toISOString()).run();

        return new Response("Turma criada", { status: 201 });
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarRemocaoTurma(contexto: ContextoSCAE): Promise<Response> {
    try {
        const tenantId = contexto.request.headers.get('X-Tenant-ID');
        if (!tenantId) return new Response("Tenant_id ausente", { status: 400 });

        const url = new URL(contexto.request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return new Response("ID da turma obrigatório", { status: 400 });
        }

        await contexto.env.DB_SCAE.prepare(
            "DELETE FROM turmas WHERE id = ? AND tenant_id = ?"
        ).bind(id, tenantId).run();

        return new Response("Turma removida", { status: 200 });
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

// Exportações com Alias para o Framework
export {
    processarBuscaTurmas as onRequestGet,
    processarCriacaoTurma as onRequestPost,
    processarRemocaoTurma as onRequestDelete
};
