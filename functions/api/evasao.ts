/**
 * API Central para o Motor de EvasÃ£o Escolar.
 * Implementa a detecÃ§Ã£o de alunos ausentes consecutivamente (Art 70 ECA).
 *
 * GET /api/evasao â†’ Retorna a lista de alertas agrupadas por turma
 * PATCH /api/evasao/:id â†’ Atualiza o status de acompanhamento
 * POST /api/evasao/processar â†’ Roda a engine varrendo o tenant por ausÃªncias
 */
import { gerarScaeUuid } from '../utils/uuid';
import type { ContextoSCAE, PayloadAtualizacaoAlerta } from '../types/ambiente';

export async function onRequest(contexto: ContextoSCAE): Promise<Response> {
    const tenantId = contexto.request.headers.get('X-Tenant-ID');

    if (!tenantId) {
        return new Response(JSON.stringify({ error: 'Tenant ID ausente' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const url = new URL(contexto.request.url);
        const path = url.pathname;
        const method = contexto.request.method;

        // 1. MOTOR DE BUSCA ON-DEMAND (Executa o Scan)
        if (method === 'POST' && path.endsWith('/processar')) {
            return await processarMotorEvasao(contexto.env.DB_SCAE, tenantId);
        }

        // 2. ATUALIZAÃ‡ÃƒO DO STATUS DO KANBAN DE EVASÃƒO
        if (method === 'PATCH') {
            const pathParts = path.split('/');
            const alertaId = pathParts[pathParts.length - 1];
            if (!alertaId || alertaId === 'evasao') {
                return new Response(JSON.stringify({ error: 'ID do alerta ausente' }), { status: 400 });
            }
            return await atualizarStatusAlerta(contexto, contexto.env.DB_SCAE, tenantId, alertaId);
        }

        // 3. LISTAGEM DO PAINEL GERENCIAL DE EVASÃƒO
        if (method === 'GET') {
            const { results } = await contexto.env.DB_SCAE.prepare(`
                SELECT 
                    a.id,
                    a.aluno_matricula,
                    a.motivo,
                    a.status,
                    a.data_criacao,
                    a.data_resolucao,
                    al.nome_completo AS aluno_nome,
                    t.id AS turma_nome
                FROM 
                    alertas_evasao a
                INNER JOIN 
                    alunos al ON a.aluno_matricula = al.matricula AND a.tenant_id = al.tenant_id
                LEFT JOIN 
                    turmas t ON al.turma_id = t.id AND al.tenant_id = t.tenant_id
                WHERE 
                    a.tenant_id = ?
                ORDER BY 
                    CASE a.status
                        WHEN 'PENDENTE' THEN 1
                        WHEN 'EM_ANALISE' THEN 2
                        WHEN 'RESOLVIDO' THEN 3
                    END,
                    a.data_criacao DESC
            `).bind(tenantId).all();

            return new Response(JSON.stringify(results), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'MÃ©todo nÃ£o permitido' }), { status: 405 });

    } catch (error) {
        const mensagem = error instanceof Error ? error.message : 'Erro interno';
        console.error('Erro na API Evasao:', mensagem);
        return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Atualiza o status da tratativa da coordenaÃ§Ã£o com a familia do aluno em risco.
 */
async function atualizarStatusAlerta(contexto: ContextoSCAE, db: D1Database, tenantId: string, alertaId: string): Promise<Response> {
    try {
        const dados: PayloadAtualizacaoAlerta = await contexto.request.json();

        if (!dados.status || !['PENDENTE', 'EM_ANALISE', 'RESOLVIDO'].includes(dados.status)) {
            return new Response(JSON.stringify({ error: 'Status invÃ¡lido' }), { status: 400 });
        }

        const query = dados.status === 'RESOLVIDO'
            ? `UPDATE alertas_evasao SET status = ?, data_resolucao = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?`
            : `UPDATE alertas_evasao SET status = ?, data_resolucao = NULL WHERE id = ? AND tenant_id = ?`;

        const resultado = await db.prepare(query).bind(dados.status, alertaId, tenantId).run();

        if (!resultado.success) {
            return new Response(JSON.stringify({ error: 'Falha ao atualizar alerta' }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch {
        return new Response(JSON.stringify({ error: 'JSON invÃ¡lido' }), { status: 400 });
    }
}

/**
 * Scaneia os alunos e verifica os registros para aplicar regras de evasÃ£o contÃ­nua.
 * Regra: Alunos ausentes por 3 dias letivos (aproximadamente simulado checando ausÃªncia de registro nas Ãºltimas 72h)
 */
async function processarMotorEvasao(db: D1Database, tenantId: string): Promise<Response> {
    try {
        // 1. Localizar Estudantes NÃ£o Anonimizados (Ativos)
        const alunosResp = await db.prepare(`
            SELECT matricula, nome_completo 
            FROM alunos 
            WHERE tenant_id = ? AND status = 'ATIVO' AND anonimizado = 0
        `).bind(tenantId).all();

        const alunosAtivos = alunosResp.results || [];
        if (alunosAtivos.length === 0) {
            return new Response(JSON.stringify({ success: true, gerados: 0, mensagem: 'Nenhum aluno ativo' }));
        }

        let alertasGerados = 0;

        for (const aluno of alunosAtivos) {
            // Verificar a existencia de UM Ãºnico pulso de log nos Ãºltimos 3 dias
            const acessoRecente = await db.prepare(`
                SELECT id FROM registros_acesso 
                WHERE aluno_matricula = ? AND tenant_id = ? 
                AND timestamp_acesso >= datetime('now', '-3 days')
                LIMIT 1
            `).bind(aluno.matricula, tenantId).first();

            if (!acessoRecente) {
                // Aluno nÃ£o registrou acesso nos Ãºltimos 3 dias!

                // Verificar se JÃ EXISTE um alerta PENDENTE ou EM ANÃLISE aberto
                const alertaAtivo = await db.prepare(`
                    SELECT id FROM alertas_evasao 
                    WHERE aluno_matricula = ? AND tenant_id = ? AND status IN ('PENDENTE', 'EM_ANALISE')
                    LIMIT 1
                `).bind(aluno.matricula, tenantId).first();

                if (!alertaAtivo) {
                    // Novo caso de Risco (EvasÃ£o Detectada)
                    const alertaId = gerarScaeUuid();
                    await db.prepare(`
                        INSERT INTO alertas_evasao(id, tenant_id, aluno_matricula, motivo, status)
                        VALUES (?, ?, ?, 'Sem registro de acesso nos Ãºltimos 3 dias', 'PENDENTE')
                    `).bind(alertaId, tenantId, aluno.matricula).run();

                    alertasGerados++;
                }
            }
        }

        return new Response(JSON.stringify({
            success: true,
            gerados: alertasGerados,
            mensagem: `VerificaÃ§Ã£o completa. ${alertasGerados} novos alertas emitidos.`
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Falha no motor de EvasÃ£o:', mensagem);
        return new Response(JSON.stringify({ error: 'Erro processando EvasÃ£o' }), { status: 500 });
    }
}
