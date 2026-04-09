/**
 * api/agente/status.ts
 * Consulta o estado de saúde dos Agentes e Hardwares.
 */
import { ContextoCatraki } from '../../tipos/ambiente';
import { extrairEscolaId, verificarAcesso } from '../_seguranca';
import { Permissao } from '../seguranca/rbac';

export async function onRequestGet(contexto: ContextoCatraki) {
    try {
        const escolaId = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.VER_ACESSO);

        const { KV_SCAE } = contexto.env;
        if (!KV_SCAE) return Response.json({ ok: false, erro: 'KV não configurado' });

        const status = await KV_SCAE.get(`escola:${escolaId}:status`, 'json');
        
        return Response.json({ 
            ok: true, 
            status: status || { agente_online: false, mensagem: 'Agente nunca visto ou offline' } 
        });
    } catch (e: any) {
        console.error(`[API Status] Falha:`, e.mensagem || e.message);
        const status = e.name === 'ErroPermissao' ? 403 : 500;
        return Response.json({ 
            ok: false, 
            erro: e.mensagem || e.message,
            codigo: e.codigo || 'UNKNOWN_ERROR'
        }, { status });
    }
}
