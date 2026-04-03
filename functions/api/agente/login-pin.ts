/**
 * functions/api/agente/login-pin.ts
 * Autenticação de Agente Local via PIN Exclusivo da Escola.
 */

import type { ContextoCatraki } from '../../tipos/ambiente';

export async function onRequestPost(contexto: ContextoCatraki): Promise<Response> {
    try {
        const { pin } = await contexto.request.json() as any;

        if (!pin || pin.length < 6) {
            return Response.json({ ok: false, mensagem: 'PIN inválido. Mínimo 6 dígitos.' }, { status: 400 });
        }

        // 1. Buscar escola e configuração de terminais pelo PIN
        // REMOVIDO: Script de auto-reparação que gerava esquemas incompletos.
        const dados = await contexto.env.DB_SCAE.prepare(
            `SELECT e.id, e.nome_escola, t.config_leitores 
             FROM escolas e 
             LEFT JOIN terminais t ON t.escola_id = e.id
             WHERE e.agente_pin = ? LIMIT 1`
        ).bind(pin).first<any>();

        if (!dados) {
            return Response.json({ ok: false, mensagem: 'PIN não encontrado ou expirado.' }, { status: 401 });
        }

        const configLeitores = dados.config_leitores ? JSON.parse(dados.config_leitores) : [];
        const tokenAgente = `CATRAKI_AUTO_${btoa(dados.id)}_${Date.now()}`;

        return Response.json({
            ok: true,
            escola_id: dados.id,
            nome_escola: dados.nome_escola,
            config_hardware: configLeitores,
            token: tokenAgente,
            mensagem: 'Terminal ativado com sucesso!'
        });

    } catch (e: any) {
        console.error('[Login API Error]', e.message);
        return Response.json({ ok: false, mensagem: 'Erro na validação do PIN.', detalhe: e.message }, { status: 500 });
    }
}
