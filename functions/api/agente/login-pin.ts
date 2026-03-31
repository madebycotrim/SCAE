/**
 * functions/api/agente/login-pin.ts
 * Autenticação de Agente Local via PIN Exclusivo da Escola.
 * Identifica a escola automaticamente pelo PIN secreto de 6 dígitos.
 */

import type { ContextoCatraki } from '../../tipos/ambiente';

export async function onRequestPost(contexto: ContextoCatraki): Promise<Response> {
    try {
        const { pin } = await contexto.request.json() as any;

        if (!pin || pin.length < 6) {
            return Response.json({ ok: false, mensagem: 'PIN inválido. Mínimo 6 dígitos.' }, { status: 400 });
        }

        // 1. Buscar escola e configuração de terminais pelo PIN
        const dados = await contexto.env.DB_CATRAKI.prepare(
            `SELECT e.id, e.nome_escola, t.config_leitores 
             FROM escolas e 
             LEFT JOIN terminais t ON t.escola_id = e.id
             WHERE e.agente_pin = ? LIMIT 1`
        ).bind(pin).first<any>();

        if (!dados) {
            return Response.json({ ok: false, mensagem: 'PIN não encontrado ou expirado.' }, { status: 401 });
        }

        // 2. Definir Configuração de Hardware Remota (Se o terminal não estiver no banco, manda padrão)
        const configLeitores = dados.config_leitores ? JSON.parse(dados.config_leitores) : [];

        // 3. Gerar Token de Sessão (Automatizado)
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
        return Response.json({ ok: false, mensagem: 'Erro interno na validação.' }, { status: 500 });
    }
}
