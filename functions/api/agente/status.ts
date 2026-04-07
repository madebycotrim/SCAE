/**
 * api/agente/status.ts
 * Consulta o estado de saúde dos Agentes e Hardwares.
 */
import { ContextoCatraki } from '../../tipos/ambiente';
import { extrairEscolaId, verificarAcesso } from '../_seguranca';
import { Permissao } from '../seguranca/rbac';

export async function onRequestGet({ request, env }: ContextoCatraki) {
    try {
        const escolaId = extrairEscolaId(request);
        verificarAcesso({ request, env } as any, Permissao.VER_ACESSO);

        const { KV_SCAE } = env;
        if (!KV_SCAE) return Response.json({ ok: false, erro: 'KV não configurado' });

        const status = await KV_SCAE.get(`escola:${escolaId}:status`, 'json');
        
        return Response.json({ 
            ok: true, 
            status: status || { agente_online: false, mensagem: 'Agente nunca visto ou offline' } 
        });
    } catch (e: any) {
        return Response.json({ ok: false, erro: e.message }, { status: 403 });
    }
}
