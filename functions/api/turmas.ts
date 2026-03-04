/**
 * Worker CRUD de Turmas.
 * GET: Todas as turmas do tenant
 * POST: UPSERT turma (id + escola_id)
 * DELETE: Remover turma por ID
 */
import type { ContextoSCAE, PayloadCriacaoTurma } from '../tipos/ambiente';

async function processarBuscaTurmas(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = contexto.request.headers.get('X-Escola-ID');
        if (!idEscola) return new Response("escola_id ausente", { status: 400 });

        const { results } = await contexto.env.DB_SCAE.prepare(
            "SELECT id, escola_id, serie, letra, turno, ano_letivo, data_criacao as criado_em FROM turmas WHERE escola_id = ? ORDER BY id"
        ).bind(idEscola).all();

        return Response.json(results);
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarCriacaoTurma(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = contexto.request.headers.get('X-Escola-ID');
        if (!idEscola) return new Response("escola_id ausente", { status: 400 });

        // RBAC: Apenas ADMIN, COORDENACAO e SECRETARIA
        const papel = contexto.data.usuarioScae?.papel;
        const podeAlterar = ['ADMIN', 'COORDENACAO', 'SECRETARIA'].includes(papel || '');
        const eDono = contexto.data.user?.email === 'madebycotrim@gmail.com';

        if (!podeAlterar && !eDono) {
            return new Response("Acesso negado: Papel insuficiente para gerenciar turmas", { status: 403 });
        }

        const { id, serie, letra, turno, ano_letivo, criado_em }: PayloadCriacaoTurma = await contexto.request.json();

        if (!id) {
            return new Response("ID da turma obrigatório", { status: 400 });
        }

        // UPSERT
        await contexto.env.DB_SCAE.prepare(
            `INSERT INTO turmas (id, escola_id, serie, letra, turno, ano_letivo, data_criacao) VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id, escola_id) DO UPDATE SET
             serie = excluded.serie,
             letra = excluded.letra,
             turno = excluded.turno,
             ano_letivo = excluded.ano_letivo`
        ).bind(id, idEscola, serie ?? null, letra ?? null, turno ?? null, ano_letivo ?? null, criado_em || new Date().toISOString()).run();

        return new Response("Turma criada", { status: 201 });
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarRemocaoTurma(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = contexto.request.headers.get('X-Escola-ID');
        if (!idEscola) return new Response("escola_id ausente", { status: 400 });

        // RBAC: Apenas ADMIN
        const papel = contexto.data.usuarioScae?.papel;
        const eDono = contexto.data.user?.email === 'madebycotrim@gmail.com';

        if (papel !== 'ADMIN' && !eDono) {
            return new Response("Acesso negado: Apenas administradores podem remover turmas", { status: 403 });
        }

        const url = new URL(contexto.request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return new Response("ID da turma obrigatório", { status: 400 });
        }

        await contexto.env.DB_SCAE.prepare(
            "DELETE FROM turmas WHERE id = ? AND escola_id = ?"
        ).bind(id, idEscola).run();

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
