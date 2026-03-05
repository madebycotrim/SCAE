/**
 * API de Notificações do Responsável.
 * Endpoint: POST /api/responsavel/notificacoes/token
 */
import { jwtVerify, type JWTPayload } from 'jose';
import type { ContextoSCAE } from '../../tipos/ambiente';

function obterChaveSecreta(env: { JWT_SECRET: string }): Uint8Array {
    const segredo = env.JWT_SECRET;
    if (!segredo) {
        throw new Error('JWT_SECRET não configurado nas variáveis de ambiente.');
    }
    return new TextEncoder().encode(segredo);
}

interface PayloadResponsavelJWT extends JWTPayload {
    responsavel_id: string;
    escola_id: string;
}

export async function onRequestPost(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = contexto.request.headers.get('X-Escola-ID');

    if (!idEscola) {
        return new Response(JSON.stringify({ error: 'Tenant ID ausente' }), { status: 400 });
    }

    const authHeader = contexto.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
    }

    try {
        const { token: fcmToken } = await contexto.request.json() as { token: string };

        if (!fcmToken) {
            return new Response(JSON.stringify({ error: 'Token FCM ausente' }), { status: 400 });
        }

        const tokenJwt = authHeader.split(' ')[1];
        const chave = obterChaveSecreta(contexto.env);

        const { payload } = await jwtVerify(tokenJwt, chave, {
            issuer: 'scae:responsavel',
            audience: idEscola,
        });

        const payloadToken = payload as PayloadResponsavelJWT;
        const responsavelId = payloadToken.responsavel_id;

        // Salvar o token no banco de dados (D1)
        await contexto.env.DB_SCAE.prepare(`
            UPDATE responsaveis 
            SET fcm_token = ?, atualizado_em = CURRENT_TIMESTAMP 
            WHERE id = ? AND escola_id = ?
        `).bind(fcmToken, responsavelId, idEscola).run();

        return new Response(JSON.stringify({ success: true, mensagem: 'Notificações ativadas com sucesso!' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Sessão inválida ou erro ao salvar token.' }), { status: 401 });
    }
}
