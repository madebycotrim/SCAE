import type { ContextoSCAE } from '../../tipos/ambiente';
import { verificarPermissao } from '../seguranca';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const { env } = contexto;
    // RBAC: Central ou Auditores podem ver todos os logs
    verificarPermissao(contexto, ['ADMIN']);

    const logs = await env.DB_SCAE.prepare(
        `SELECT
            a.*,
            t.nome_escola
            FROM logs_auditoria a
            LEFT JOIN escolas t ON a.escola_id = t.id
            ORDER BY a.timestamp DESC
            LIMIT 100`
    ).all();

    return Response.json({
        dados: logs.results,
        mensagem: 'Logs de auditoria carregados'
    });
}
