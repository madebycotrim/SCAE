/**
 * functions/api/agente/login-pin.ts
 * Autenticação de Agente Local via PIN Exclusivo da Escola.
 * Identifica a escola automaticamente pelo PIN secreto de 6 dígitos.
 */

import type { ContextoSCAE } from '../../tipos/ambiente';

export async function onRequestPost(contexto: ContextoSCAE): Promise<Response> {
    try {
        const { pin } = await contexto.request.json() as any;

        if (!pin || pin.length < 6) {
            return Response.json({ ok: false, mensagem: 'PIN inválido. Mínimo 6 dígitos.' }, { status: 400 });
        }

        // 1. Buscar escola pelo PIN exclusivo
        const escola = await contexto.env.DB_SCAE.prepare(
            `SELECT id, nome_escola FROM escolas WHERE agente_pin = ? LIMIT 1`
        ).bind(pin).first<any>();

        if (!escola) {
            return Response.json({ ok: false, mensagem: 'PIN não encontrado ou expirado.' }, { status: 401 });
        }

        // 2. Gerar Token de Sessão (Simulado para o Agente)
        // Em produção aqui geraríamos um JWT assinado com a chave da escola
        const tokenAgente = `SCAE_AUTO_${btoa(escola.id)}_${Date.now()}`;

        return Response.json({
            ok: true,
            escola_id: escola.id,
            nome_escola: escola.nome_escola,
            token: tokenAgente,
            mensagem: 'Terminal ativado com sucesso!'
        });

    } catch (e: any) {
        return Response.json({ ok: false, mensagem: 'Erro interno na validação.' }, { status: 500 });
    }
}
