/**
 * Worker CRUD de Alunos.
 * GET: Todos os alunos ativos do tenant
 * POST: UPSERT aluno (matrícula + escola_id)
 * DELETE: Remover aluno por matrícula
 */
import type { ContextoSCAE, PayloadCriacaoAluno } from '../tipos/ambiente';

async function processarBuscaAlunos(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = contexto.request.headers.get('X-Escola-ID');
        if (!idEscola) return new Response("escola_id ausente", { status: 400 });

        // RBAC: Apenas ADMIN, COORDENACAO e SECRETARIA
        const papel = contexto.data.usuarioScae?.papel;
        const eAdminOuCoordenacao = ['ADMIN', 'COORDENACAO', 'SECRETARIA'].includes(papel || '');
        const eDono = contexto.data.user?.email === 'madebycotrim@gmail.com';

        if (!eAdminOuCoordenacao && !eDono) {
            return new Response("Acesso negado: Papel insuficiente para listar alunos", { status: 403 });
        }

        const { results } = await contexto.env.DB_SCAE.prepare(
            "SELECT matricula, escola_id, nome_completo, turma_id, ativo, base_legal, finalidade_coleta, prazo_retencao_meses, data_anonimizacao, anonimizado, criado_em, atualizado_em, data_exclusao FROM alunos WHERE escola_id = ?"
        ).bind(idEscola).all();

        return Response.json(results);
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarCriacaoAluno(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = contexto.request.headers.get('X-Escola-ID');
        if (!idEscola) return new Response("escola_id ausente", { status: 400 });

        // RBAC: Apenas ADMIN, COORDENACAO e SECRETARIA
        const papel = contexto.data.usuarioScae?.papel;
        const podeCriar = ['ADMIN', 'COORDENACAO', 'SECRETARIA'].includes(papel || '');
        const eDono = contexto.data.user?.email === 'madebycotrim@gmail.com';

        if (!podeCriar && !eDono) {
            return new Response("Acesso negado: Papel insuficiente para cadastrar alunos", { status: 403 });
        }

        const { matricula, nome_completo, turma_id, ativo, email_responsavel }: PayloadCriacaoAluno = await contexto.request.json();

        if (!matricula || !nome_completo) {
            return new Response("Campos obrigatórios ausentes", { status: 400 });
        }

        // UPSERT: Inserir ou Atualizar Aluno
        await contexto.env.DB_SCAE.prepare(
            `INSERT INTO alunos (matricula, escola_id, nome_completo, turma_id, ativo, base_legal, finalidade_coleta, prazo_retencao_meses) VALUES (?, ?, ?, ?, ?, 'obrigacao_legal', 'registro_acesso', 24)
             ON CONFLICT(matricula, escola_id) DO UPDATE SET
             nome_completo = excluded.nome_completo,
             turma_id = excluded.turma_id,
             ativo = excluded.ativo,
             atualizado_em = CURRENT_TIMESTAMP`
        ).bind(matricula, idEscola, nome_completo, turma_id ?? null, ativo ? 1 : 0).run();

        // Se houver e-mail de responsável, processar inserção + vínculo
        if (email_responsavel && email_responsavel.trim() !== '') {
            const emailLimpo = email_responsavel.trim().toLowerCase();

            // 1. Tentar achar um responsavel existente com esse e-mail na escola
            const { results: respExistente } = await contexto.env.DB_SCAE.prepare(
                "SELECT id FROM responsaveis WHERE email = ? AND escola_id = ?"
            ).bind(emailLimpo, idEscola).all();

            let responsavelId = '';

            if (respExistente && respExistente.length > 0) {
                responsavelId = respExistente[0].id as string;
            } else {
                // Cria novo responsável
                responsavelId = crypto.randomUUID();
                await contexto.env.DB_SCAE.prepare(
                    `INSERT INTO responsaveis (id, escola_id, email, nome_completo, base_legal, finalidade_coleta, prazo_retencao_meses) 
                     VALUES (?, ?, ?, ?, 'consentimento', 'portal_familia', 24)`
                ).bind(responsavelId, idEscola, emailLimpo, 'Responsável de ' + nome_completo).run();
            }

            // 2. Criar o vínculo usando IF NOT EXISTS logic
            await contexto.env.DB_SCAE.prepare(
                `INSERT INTO vinculos_responsavel_aluno (responsavel_id, aluno_matricula, escola_id)
                 SELECT ?, ?, ?
                 WHERE NOT EXISTS (
                      SELECT 1 FROM vinculos_responsavel_aluno 
                      WHERE responsavel_id = ? AND aluno_matricula = ? AND escola_id = ?
                  )`
            ).bind(responsavelId, matricula, idEscola, responsavelId, matricula, idEscola).run();
        }

        return new Response("Criado", { status: 201 });
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarRemocaoAluno(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = contexto.request.headers.get('X-Escola-ID');
        if (!idEscola) return new Response("escola_id ausente", { status: 400 });

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
            "DELETE FROM alunos WHERE matricula = ? AND escola_id = ?"
        ).bind(matricula, idEscola).run();

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
