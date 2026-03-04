import type { ContextoSCAE } from '../../tipos/ambiente';

/**
 * Lista os logs de auditoria globalmente.
 * Restrito a administradores globais (CENTRAL).
 * Por enquanto, busca dados da tabela de auditoria no D1.
 * Futuramente pode buscar do R2 para logs de longo prazo.
 */
export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const { env } = contexto;

    try {
        // Busca os logs mais recentes de auditoria
        const logs = await env.DB_SCAE.prepare(
            `SELECT
                a.*,
                t.nome_escola
             FROM logs_auditoria a
             LEFT JOIN escolas t ON a.escola_id = t.id
             ORDER BY a.timestamp DESC
             LIMIT 100`
        ).all();

        return new Response(JSON.stringify({ dados: logs.results }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (erro) {
        console.error('Erro ao listar logs de auditoria:', erro);
        return new Response(JSON.stringify({ erro: 'Falha ao buscar registros de auditoria.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
