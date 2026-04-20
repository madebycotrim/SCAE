/**
 * api/agente/heartbeat.ts
 * Recebe sinais de vida dos Agentes Locais e AUTO-PROVISIONA o hardware.
 */
import { ContextoCatraki } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

export async function onRequestPost({ request, env }: ContextoCatraki) {
    const escolaId = validarAgente(request, env);
    const corpo = await request.json() as any;

    const { KV_SCAE, DB_SCAE: db } = env;

    // 1. Persistência de Saúde (KV) para o Dashboard (TTL 90s)
    if (KV_SCAE) {
        await KV_SCAE.put(`escola:${escolaId}:status`, JSON.stringify(corpo), { expirationTtl: 90 });
    }

    // 2. AUTO-PROVISIONAMENTO (D1)
    // Se o agente enviou hardware, vamos garantir que a nuvem saiba quem eles são.
    if (corpo.status && Array.isArray(corpo.status) && corpo.status.length > 0) {
        try {
            const existe = await db.prepare("SELECT escola_id FROM terminais WHERE escola_id = ?").bind(escolaId).first();
            if (!existe) {
                await db.prepare("INSERT INTO terminais (escola_id, config_leitores) VALUES (?, ?)")
                    .bind(escolaId, JSON.stringify(corpo.status))
                    .run();
            }
        } catch (e: any) {
            console.error('[Heartbeat] Falha ao auto-provisionar hardware:', e.message);
        }
    }

    // 3. ATUALIZAÇÃO DE ENDEREÇO DO AGENTE (Túnel/Localhost)
    if (corpo.url_agente !== undefined) {
        try {
            await db.prepare("UPDATE escolas SET url_agente = ? WHERE id = ?")
                .bind(corpo.url_agente, escolaId)
                .run();
        } catch (e: any) {
            console.error('[Heartbeat] Falha ao atualizar URL do Agente:', e.message);
        }
    }
    
    return Response.json({ ok: true });
}
