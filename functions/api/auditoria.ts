/**
 * Worker de Logs de Auditoria.
 * POST: Receber batch de logs do frontend
 * GET: Buscar logs (Smart Sync â€” desde timestamp)
 */
import type { ContextoSCAE, LogAuditoriaDB, ResultadoSincronizacao } from '../types/ambiente';

async function processarRecebimentoLogs(contexto: ContextoSCAE): Promise<Response> {
    try {
        const tenantId = contexto.request.headers.get('X-Tenant-ID');
        if (!tenantId) return new Response("Tenant_id ausente", { status: 400 });

        const logs: LogAuditoriaDB[] = await contexto.request.json();

        if (!Array.isArray(logs)) {
            return new Response("Esperado array de logs", { status: 400 });
        }

        const resultados: ResultadoSincronizacao[] = [];

        for (const log of logs) {
            try {
                // IDEMPOTÊNCIA: Inserir ou ignorar se já existe
                await contexto.env.DB_SCAE.prepare(
                    `INSERT OR IGNORE INTO logs_auditoria 
                    (id, tenant_id, data_criacao, usuario_email, acao, entidade_tipo, entidade_id, dados_anteriores, dados_novos, ip_address, user_agent) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    log.id,
                    tenantId,
                    log.data_criacao || new Date().toISOString(),
                    log.usuario_email ?? null,
                    log.acao ?? null,
                    log.entidade_tipo ?? null,
                    log.entidade_id ?? null,
                    log.dados_anteriores ?? null,
                    log.dados_novos ?? null,
                    log.ip_address ?? null,
                    log.user_agent ?? null
                ).run();

                resultados.push({ id: log.id, status: 'sincronizado' });
            } catch (erro) {
                const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido';
                console.error(`Erro ao inserir log ${log.id}:`, mensagem);
                resultados.push({ id: log.id, status: 'erro', erro: mensagem });
            }
        }

        return Response.json(resultados);
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarVerificacaoLogs(contexto: ContextoSCAE): Promise<Response> {
    const { request, env } = contexto;
    const tenantId = request.headers.get('X-Tenant-ID');
    if (!tenantId) return new Response("Tenant_id ausente", { status: 400 });

    const url = new URL(request.url);
    const desde = url.searchParams.get('desde');

    try {
        let query = `SELECT * FROM logs_auditoria WHERE tenant_id = ?`;
        const params: string[] = [tenantId];

        if (desde) {
            query += ` AND data_criacao > ?`;
            params.push(desde);
        }

        query += ` ORDER BY data_criacao DESC LIMIT 500`;

        const { results } = await env.DB_SCAE.prepare(query).bind(...params).all();
        return Response.json(results);
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(JSON.stringify({ erro: mensagem }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Exportações com Alias
export { processarRecebimentoLogs as onRequestPost, processarVerificacaoLogs as onRequestGet };
