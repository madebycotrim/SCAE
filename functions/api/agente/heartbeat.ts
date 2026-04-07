/**
 * api/agente/heartbeat.ts
 * Recebe sinais de vida dos Agentes Locais para monitoramento.
 */
import { ContextoCatraki } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

export async function onRequestPost({ request, env }: ContextoCatraki) {
    const escolaId = validarAgente(request, env);
    const corpo = await request.json() as any;

    // Persistimos a saúde no KV com TTL de 90 segundos.
    // Se o Agente parar de enviar por mais de 90s, o registro some e a UI mostra "Offline".
    const { KV_SCAE } = env;
    if (KV_SCAE) {
        await KV_SCAE.put(`escola:${escolaId}:status`, JSON.stringify(corpo), { expirationTtl: 90 });
    }
    
    return Response.json({ ok: true });
}
