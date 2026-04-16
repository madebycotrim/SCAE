import { ContextoCatraki } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

/**
 * Retorna as configurações globais da unidade para o Agente Local.
 */
export async function onRequestGet(contexto: ContextoCatraki): Promise<Response> {
    const { request, env } = contexto;

    try {
        // Valida token do agente
        const escolaId = validarAgente(request, env);
        
        // Busca configurações no D1
        const configs = await env.DB_SCAE.prepare(`
            SELECT config_metodo_acesso, config_qr_dinamico, config_tts_ativado, config_tts_frase, config_saida_obrigatoria
            FROM escolas
            WHERE slug = ?
        `).bind(escolaId).first();

        if (!configs) {
            return new Response(JSON.stringify({ ok: false, erro: 'Escola não encontrada.' }), { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Mapeia para o formato esperado pelo Agente
        const resposta = {
            metodoAcesso: configs.config_metodo_acesso,
            qrDinamico: !!configs.config_qr_dinamico,
            ttsAtivado: !!configs.config_tts_ativado,
            ttsFrase: configs.config_tts_frase || 'Bem-vindo, {nome}!',
            saidaObrigatoria: !!configs.config_saida_obrigatoria
        };

        return Response.json(resposta);

    } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, erro: e.message }), { 
            status: e.status || 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
