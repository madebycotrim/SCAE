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
    if (corpo.hardware && Array.isArray(corpo.hardware) && corpo.hardware.length > 0) {
        try {
            // Verifica se já existe configuração para esta escola
            const existe = await db.prepare("SELECT escola_id FROM terminais WHERE escola_id = ?").bind(escolaId).first();

            if (!existe) {
                // Primeira conexão: Salva a configuração local como a mestre na nuvem
                console.log(`[Auto-Provisionamento] Cadastrando ${corpo.hardware.length} novos leitores para a escola ${escolaId}`);
                await db.prepare(`
                    INSERT INTO terminais (escola_id, config_leitores) 
                    VALUES (?, ?)
                `).bind(escolaId, JSON.stringify(corpo.hardware)).run();
            } else {
                // Se já existe, poderíamos atualizar, mas por segurança vamos apenas logar ou 
                // atualizar apenas campos dinâmicos se necessário. 
                // Por enquanto, o Agente é o mestre se a nuvem estiver vazia.
            }
        } catch (e: any) {
            console.error('[Heartbeat] Falha ao auto-provisionar hardware:', e.message);
        }
    }
    
    return Response.json({ ok: true });
}
