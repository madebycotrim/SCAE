/**
 * Worker de Registros de Acesso (Catraca/Portaria).
 * POST: Sincronizar registros offline â†’ D1
 * GET: Buscar registros recentes por data/desde/limite
 */
import type { ContextoSCAE, PayloadRegistroAcesso, ResultadoSincronizacao } from '../tipos/ambiente';

async function processarSincronizacaoAcessos(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = contexto.request.headers.get('X-Escola-ID');
        if (!idEscola) return new Response("escola_id ausente", { status: 400 });

        const registros: PayloadRegistroAcesso[] = await contexto.request.json();

        if (!Array.isArray(registros)) {
            return new Response("Esperado array de registros", { status: 400 });
        }

        const resultados: ResultadoSincronizacao[] = [];

        for (const registro of registros) {
            try {
                // IDEMPOTÊNCIA: Usar INSERT OR IGNORE.
                await contexto.env.DB_SCAE.prepare(
                    `INSERT OR IGNORE INTO registros_acesso 
                    (id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura, timestamp_acesso, sincronizado, prazo_retencao_meses) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    registro.id,
                    idEscola,
                    registro.aluno_matricula,
                    registro.tipo_movimentacao,
                    registro.metodo_validacao || 'manual',
                    registro.timestamp,
                    1,
                    24
                ).run();

                resultados.push({ id: registro.id, status: 'sincronizado' });

            } catch (erro) {
                const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido';
                console.error(`Erro ao inserir registro ${registro.id}:`, mensagem);
                resultados.push({ id: registro.id, status: 'erro', erro: mensagem });
            }
        }

        return Response.json(resultados);
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

async function processarBuscaAcessos(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = contexto.request.headers.get('X-Escola-ID');
        if (!idEscola) return new Response("escola_id ausente", { status: 400 });

        // RBAC: Apenas ADMIN, COORDENACAO e SECRETARIA
        const papel = contexto.data.usuarioScae?.papel;
        const eGestorOuAdmin = ['ADMIN', 'COORDENACAO', 'SECRETARIA'].includes(papel || '');
        const eDono = contexto.data.user?.email === 'madebycotrim@gmail.com';

        if (!eGestorOuAdmin && !eDono) {
            return new Response("Acesso negado: Papel insuficiente para listar histórico de acessos", { status: 403 });
        }

        const { searchParams } = new URL(contexto.request.url);
        const limite = searchParams.get('limite') || '1000';
        const data = searchParams.get('data');
        const desde = searchParams.get('desde');

        let query = "SELECT id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura as metodo_validacao, timestamp_acesso as timestamp, sincronizado, prazo_retencao_meses FROM registros_acesso WHERE escola_id = ?";
        const params: (string | number)[] = [idEscola];

        if (data) {
            query += " AND substr(timestamp_acesso, 1, 10) = ?";
            params.push(data);
        } else if (desde) {
            query += " AND timestamp_acesso > ?";
            params.push(desde);
        }

        query += " ORDER BY timestamp_acesso DESC LIMIT ?";
        params.push(Number(limite));

        const { results } = await contexto.env.DB_SCAE.prepare(query).bind(...params).all();

        return Response.json(results);
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(mensagem, { status: 500 });
    }
}

// Exportações com Alias para o Framework
export {
    processarSincronizacaoAcessos as onRequestPost,
    processarBuscaAcessos as onRequestGet
};
