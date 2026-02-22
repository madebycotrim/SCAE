
async function processarRecebimentoLogs(contexto) {
    // Apenas Autenticado: Receber logs de auditoria
    try {
        const logs = await contexto.request.json();

        if (!Array.isArray(logs)) {
            return new Response("Esperado array de logs", { status: 400 });
        }

        const resultados = [];

        for (const log of logs) {
            try {
                // IDEMPOTÊNCIA: Inserir ou ignorar se já existe
                await contexto.env.DB_SCAE.prepare(
                    `INSERT OR IGNORE INTO logs_auditoria 
                    (id, timestamp, usuario_email, acao, entidade_tipo, entidade_id, dados_anteriores, dados_novos, ip_address, user_agent, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    log.id,
                    log.timestamp,
                    log.usuario_email,
                    log.acao,
                    log.entidade_tipo,
                    log.entidade_id,
                    log.dados_anteriores, // Já deve vir como string JSON do frontend
                    log.dados_novos,      // Já deve vir como string JSON do frontend
                    log.ip_address,
                    log.user_agent,
                    log.created_at || new Date().toISOString()
                ).run();

                resultados.push({ id: log.id, status: 'sincronizado' });
            } catch (erro) {
                console.error(`Erro ao inserir log ${log.id}:`, erro);
                resultados.push({ id: log.id, status: 'erro', erro: erro.message });
            }
        }

        return Response.json(resultados);
    } catch (erro) {
        return new Response(erro.message, { status: 500 });
    }
}

// Exportações com Alias
// Handler para GET (Smart Sync)
async function processarVerificacaoLogs(contexto) {
    const { request, env } = contexto;
    const url = new URL(request.url);
    const desde = url.searchParams.get('desde');

    try {
        let query = `SELECT * FROM logs_auditoria`;
        const params = [];

        if (desde) {
            query += ` WHERE timestamp > ?`;
            params.push(desde);
        }

        query += ` ORDER BY timestamp DESC LIMIT 500`;

        const { results } = await env.DB_SCAE.prepare(query).bind(...params).all();
        return Response.json(results);
    } catch (erro) {
        return new Response(JSON.stringify({ erro: erro.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Exportações com Alias
export { processarRecebimentoLogs as onRequestPost, processarVerificacaoLogs as onRequestGet };
