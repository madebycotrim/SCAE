/**
 * api/agente/comandos.ts
 * Sistema de Controle Remoto (Comandos Pendentes).
 * Permite que a nuvem envie ordens para o Agente Local (Abrir catraca, Reboot, Sync).
 */
import { ContextoCatraki } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';
import { extrairEscolaId, verificarAcesso } from '../_seguranca';
import { Permissao } from '../seguranca/rbac';

/** 
 * GET: O Agente Local chama este endpoint para saber se há ordens para ele executar.
 */
export async function onRequestGet({ request, env }: ContextoCatraki) {
    try {
        const escolaId = validarAgente(request, env);
        const { KV_SCAE } = env;

        if (!KV_SCAE) return Response.json({ ok: false, erro: 'KV não configurado' });

        const comandos = await KV_SCAE.get(`escola:${escolaId}:comandos`, 'json') as any[] || [];
        
        return Response.json({ ok: true, comandos });
    } catch {
        return Response.json({ ok: false }, { status: 401 });
    }
}

/**
 * POST: O Painel Administrativo envia um comando para um Agente.
 */
export async function onRequestPost({ request, env }: ContextoCatraki) {
    try {
        const escolaId = extrairEscolaId(request);
        verificarAcesso({ request, env } as any, Permissao.GERENCIAR_AGENTE);

        const { acao, params } = await request.json() as { acao: string, params?: any };
        const { KV_SCAE } = env;

        if (!KV_SCAE) return Response.json({ ok: false, erro: 'KV não configurado' });

        const chaveQueue = `escola:${escolaId}:comandos`;
        const comandosAtuais = await KV_SCAE.get(chaveQueue, 'json') as any[] || [];
        
        const novoComando = {
            id: crypto.randomUUID(),
            acao,
            params: params || {},
            timestamp: new Date().toISOString()
        };

        comandosAtuais.push(novoComando);
        
        // Mantém comandos por apenas 10 minutos na fila se o agente não os ler
        await KV_SCAE.put(chaveQueue, JSON.stringify(comandosAtuais), { expirationTtl: 600 });

        return Response.json({ ok: true, comandoId: novoComando.id });
    } catch (e: any) {
        return Response.json({ ok: false, erro: e.message }, { status: 403 });
    }
}

/**
 * DELETE: O Agente Local notifica que já executou um comando, removendo-o da fila.
 */
export async function onRequestDelete({ request, env }: ContextoCatraki) {
    try {
        const escolaId = validarAgente(request, env);
        const { searchParams } = new URL(request.url);
        const comandoId = searchParams.get('id');
        
        if (!comandoId) return Response.json({ ok: false });

        const { KV_SCAE } = env;
        if (!KV_SCAE) return Response.json({ ok: false });

        const chaveQueue = `escola:${escolaId}:comandos`;
        const comandosAtuais = await KV_SCAE.get(chaveQueue, 'json') as any[] || [];
        
        const filaFiltrada = comandosAtuais.filter((c: any) => c.id !== comandoId);
        
        if (filaFiltrada.length === 0) {
            await KV_SCAE.delete(chaveQueue);
        } else {
            await KV_SCAE.put(chaveQueue, JSON.stringify(filaFiltrada), { expirationTtl: 600 });
        }

        return Response.json({ ok: true });
    } catch {
        return Response.json({ ok: false }, { status: 401 });
    }
}
