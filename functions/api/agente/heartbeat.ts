/**
 * api/agente/heartbeat.ts
 * Recebe sinais de vida dos Agentes Locais para monitoramento.
 */
import { ContextoCatraki } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

export async function onRequestPost({ request, env }: ContextoCatraki) {
    const escolaId = validarAgente(request, env);
    const corpo = await request.json() as { timestamp: string, leitores: any[] };

    // Usamos o KV (se disponível) ou D1 para registrar o vigor do terminal.
    // Como D1 é bom para persistência, vamos registrar na tabela 'terminais' (precisa criar).
    // Por enquanto, apenas logamos no servidor para confirmar funcionalidade.
    
    console.log(`[Heartbeat] Agente da Escola ${escolaId} Ativo em ${corpo.timestamp}`);
    
    return Response.json({ ok: true, recebido: corpo.timestamp });
}
