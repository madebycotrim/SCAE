/**
 * Worker CRUD de Alunos.
 * GET: Todos os alunos ativos do tenant
 * POST: UPSERT aluno (matrícula + tenant_id)
 * DELETE: Remover aluno por matrícula
 */
import type { ContextoSCAE, PayloadCriacaoAluno } from '../tipos/ambiente';

async function processarBuscaAlunos(contexto: ContextoSCAE): Promise<Response> {
    try {
        const tenantId = contexto.request.headers.get('X-Tenant-ID');
        if (!tenantId) return new Response("Tenant_id ausente", { status: 400 });

        // RBAC: Apenas ADMIN, COORDENACAO e SECRETARIA
        const papel = contexto.data.usuarioScae?.papel;
        const eAdminOuCoordenacao = ['ADMIN', 'COORDENACAO', 'SECRETARIA'].includes(papel || '');
        const eDono = contexto.data.user?.email === 'madebycotrim@gmail.com';

        if (!eAdminOuCoordenacao && !eDono) {
            return new Response("Acesso negado: Papel insuficiente para listar alunos", { status: 403 });
        }

        const { results } = await contexto.env.DB_SCAE.prepare(
            "SELECT matricula, tenant_id, nome_completo, turma_id, ativo, base_legal, finalidade_coleta, prazo_retencao_meses, data_anonimizacao, anonimizado, criado_em, atualizado_em, data_exclusao FROM alunos WHERE tenant_id = ?"
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

        // RBAC: Apenas ADMIN, COORDENACAO e SECRETARIA
        const papel = contexto.data.usuarioScae?.papel;
        const podeCriar = ['ADMIN', 'COORDENACAO', 'SECRETARIA'].includes(papel || '');
        const eDono = contexto.data.user?.email === 'madebycotrim@gmail.com';

        if (!podeCriar && !eDono) {
            return new Response("Acesso negado: Papel insuficiente para cadastrar alunos", { status: 403 });
        }

        const { matricula, nome_completo, turma_id, ativo }: PayloadCriacaoAluno = await contexto.request.json();

        if (!matricula || !nome_completo) {
            return new Response("Campos obrigatórios ausentes", { status: 400 });
        }

        // UPSERT: Inserir ou Atualizar
        await contexto.env.DB_SCAE.prepare(
            `INSERT INTO alunos (matricula, tenant_id, nome_completo, turma_id, ativo, base_legal, finalidade_coleta, prazo_retencao_meses) VALUES (?, ?, ?, ?, ?, 'obrigacao_legal', 'registro_acesso', 24)
             ON CONFLICT(matricula, tenant_id) DO UPDATE SET
             nome_completo = excluded.nome_completo,
             turma_id = excluded.turma_id,
             ativo = excluded.ativo,
             atualizado_em = CURRENT_TIMESTAMP`
        ).bind(matricula, tenantId, nome_completo, turma_id ?? null, ativo ? 1 : 0).run();

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

        // RBAC: Apenas ADMIN
        const papel = contexto.data.usuarioScae?.papel;
        const eDono = contexto.data.user?.email === 'madebycotrim@gmail.com';

        if (papel !== 'ADMIN' && !eDono) {
            return new Response("Acesso negado: Apenas administradores podem remover alunos", { status: 403 });
        }

        const url = new URL(contexto.request.url);
        const matricula = url.searchParams.get("matricula");

        if (!matricula) {
            return new Response("Matrícula obrigatória", { status: 400 });
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

// Exportações com Alias para o Framework
export {
    processarBuscaAlunos as onRequestGet,
    processarCriacaoAluno as onRequestPost,
    processarRemocaoAluno as onRequestDelete
};
