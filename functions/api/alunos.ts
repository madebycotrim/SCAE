/**
 * Worker CRUD de Alunos.
 * GET: Todos os alunos ativos do tenant
 * POST: UPSERT aluno (matrÃ­cula + tenant_id)
 * DELETE: Remover aluno por matrÃ­cula
 */
import type { ContextoSCAE, PayloadCriacaoAluno } from '../types/ambiente';

async function processarBuscaAlunos(contexto: ContextoSCAE): Promise<Response> {
    try {
        const tenantId = contexto.request.headers.get('X-Tenant-ID');
        if (!tenantId) return new Response("Tenant_id ausente", { status: 400 });

        const { results } = await contexto.env.DB_SCAE.prepare(
            "SELECT * FROM alunos WHERE tenant_id = ?"
        ).bind(tenantId).all();

        return Response.json(results);
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarCriacaoAluno(contexto: ContextoSCAE): Promise<Response> {
    try {
        const tenantId = contexto.request.headers.get('X-Tenant-ID');
        if (!tenantId) return new Response("Tenant_id ausente", { status: 400 });

        const { matricula, nome_completo, turma_id, status }: PayloadCriacaoAluno = await contexto.request.json();

        if (!matricula || !nome_completo) {
            return new Response("Campos obrigatÃ³rios ausentes", { status: 400 });
        }

        // UPSERT: Inserir ou Atualizar
        await contexto.env.DB_SCAE.prepare(
            `INSERT INTO alunos (matricula, tenant_id, nome_completo, turma_id, status, base_legal, finalidade_coleta, prazo_retencao_meses) VALUES (?, ?, ?, ?, ?, 'obrigacao_legal', 'registro_acesso', 24)
             ON CONFLICT(matricula, tenant_id) DO UPDATE SET
             nome_completo = excluded.nome_completo,
             turma_id = excluded.turma_id,
             status = excluded.status`
        ).bind(matricula, tenantId, nome_completo, turma_id ?? null, status || 'ATIVO').run();

        return new Response("Criado", { status: 201 });
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarRemocaoAluno(contexto: ContextoSCAE): Promise<Response> {
    try {
        const tenantId = contexto.request.headers.get('X-Tenant-ID');
        if (!tenantId) return new Response("Tenant_id ausente", { status: 400 });

        const url = new URL(contexto.request.url);
        const matricula = url.searchParams.get("matricula");

        if (!matricula) {
            return new Response("MatrÃ­cula obrigatÃ³ria", { status: 400 });
        }

        await contexto.env.DB_SCAE.prepare(
            "DELETE FROM alunos WHERE matricula = ? AND tenant_id = ?"
        ).bind(matricula, tenantId).run();

        return new Response("Aluno removido", { status: 200 });
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

// ExportaÃ§Ãµes com Alias para o Framework
export {
    processarBuscaAlunos as onRequestGet,
    processarCriacaoAluno as onRequestPost,
    processarRemocaoAluno as onRequestDelete
};
