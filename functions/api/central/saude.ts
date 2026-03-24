/**
 * GET /api/central/saude
 * Healthcheck endpoint para monitoramento do sistema.
 * Retorna status do banco D1 e metadata.
 */
import type { ContextoSCAE } from '../../tipos/ambiente';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const inicio = Date.now();
    let dbStatus: 'ok' | 'erro' = 'ok';
    let dbLatencia = 0;

    try {
        await contexto.env.DB_SCAE.prepare('SELECT 1').first();
        dbLatencia = Date.now() - inicio;
    } catch {
        dbStatus = 'erro';
        dbLatencia = Date.now() - inicio;
    }

    let kvStatus: 'ok' | 'erro' = 'ok';
    try {
        await contexto.env.KV_SCAE.get('__healthcheck__');
    } catch {
        kvStatus = 'erro';
    }

    const statusGeral = dbStatus === 'ok' && kvStatus === 'ok' ? 'ok' : 'degradado';

    return Response.json({
        status: statusGeral,
        versao: '1.0.0',
        timestamp: new Date().toISOString(),
        servicos: {
            d1: { status: dbStatus, latencia_ms: dbLatencia },
            kv: { status: kvStatus }
        }
    }, {
        status: statusGeral === 'ok' ? 200 : 503,
        headers: { 'Cache-Control': 'no-store' }
    });
}
