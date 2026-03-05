import type { ContextoSCAE } from '../../tipos/ambiente';
import { verificarPermissao } from '../seguranca';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const { env } = contexto;
    // RBAC: Central ou Auditores podem ver todos os logs
    verificarPermissao(contexto, ['ADMIN']);

    const logs = await env.DB_SCAE.prepare(
        `SELECT
            a.*,
            t.nome_escola,
            u.nome_completo as usuario_nome
            FROM logs_auditoria a
            LEFT JOIN escolas t ON a.escola_id = t.id
            LEFT JOIN (
                SELECT email, nome_completo, ROW_NUMBER() OVER(PARTITION BY email ORDER BY atualizado_em DESC) as rn
                FROM usuarios
            ) u ON a.usuario_email = u.email AND u.rn = 1
            ORDER BY a.timestamp DESC
            LIMIT 100`
    ).all();

    return Response.json({
        dados: logs.results,
        mensagem: 'Logs de auditoria carregados'
    });
}
