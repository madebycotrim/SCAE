async function processarSincronizacaoAcessos(contexto) {
    // Sincronizar registros offline
    try {
        const registros = await contexto.request.json();

        if (!Array.isArray(registros)) {
            return new Response("Esperado array de registros", { status: 400 });
        }

        const resultados = [];

        for (const registro of registros) {
            try {
                // IDEMPOTÊNCIA: Usar INSERT OR IGNORE.
                await contexto.env.DB_SCAE.prepare(
                    `INSERT OR IGNORE INTO registros_acesso 
                    (id, aluno_matricula, tipo_movimentacao, timestamp, sincronizado, autorizado_por, metodo_validacao) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    registro.id,
                    registro.aluno_matricula,
                    registro.tipo_movimentacao,
                    registro.timestamp,
                    1, // sincronizado = true (1)
                    registro.autorizado_por || null,
                    registro.metodo_validacao || 'manual'
                ).run();

                resultados.push({ id: registro.id, status: 'sincronizado' });
            } catch (erro) {
                console.error(`Erro ao inserir registro ${registro.id}:`, erro);
                resultados.push({ id: registro.id, status: 'erro', erro: erro.message });
            }
        }

        return Response.json(resultados);
    } catch (erro) {
        return new Response(erro.message, { status: 500 });
    }
}

async function processarBuscaAcessos(contexto) {
    // Buscar registros recentes
    try {
        const { searchParams } = new URL(contexto.request.url);
        const limite = searchParams.get('limite') || 1000; // Aumentei o default já que agora temos filtro
        const data = searchParams.get('data'); // YYYY-MM-DD
        const desde = searchParams.get('desde'); // ISO Timestamp

        let query = "SELECT * FROM registros_acesso";
        const params = [];

        if (data) {
            // SQLite: substr(timestamp, 1, 10) pega 'YYYY-MM-DD' de um ISO string
            query += " WHERE substr(timestamp, 1, 10) = ?";
            params.push(data);
        } else if (desde) {
            query += " WHERE timestamp > ?";
            params.push(desde);
        }

        query += " ORDER BY timestamp DESC LIMIT ?";
        params.push(limite);

        const { results } = await contexto.env.DB_SCAE.prepare(query).bind(...params).all();

        return Response.json(results);
    } catch (erro) {
        return new Response(erro.message, { status: 500 });
    }
}

// Exportações com Alias para o Framework
export {
    processarSincronizacaoAcessos as onRequestPost,
    processarBuscaAcessos as onRequestGet
};
