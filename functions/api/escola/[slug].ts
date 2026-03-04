/**
 * API para buscar configurações de um Tenant (Escola) por Slug via Parâmetro Dinâmico.
 * Caminho: /api/tenant/[slug]
 */
import type { ContextoSCAE } from '../../tipos/ambiente';

export async function onRequestGet(contexto: ContextoSCAE & { params: { slug: string } }): Promise<Response> {
    try {
        const slug = contexto.params.slug;

        if (!slug) {
            return new Response(JSON.stringify({ error: 'Slug da escola ausente' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const escola = await contexto.env.DB_SCAE.prepare(
            "SELECT id, nome_escola as nomeEscola, dominio_email as dominioEmail, cor_primaria as corPrimaria, cor_secundaria as corSecundaria, tts_ativado as ttsAtivado FROM escolas WHERE id = ?"
        ).bind(slug).first();

        if (!escola) {
            return new Response(JSON.stringify({ error: 'Escola não encontrada' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const resultado = {
            ...escola,
            ttsAtivado: Boolean(escola.ttsAtivado)
        };

        return new Response(JSON.stringify(resultado), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600'
            }
        });

    } catch (error) {
        const mensagem = error instanceof Error ? error.message : 'Erro interno';
        return new Response(JSON.stringify({ error: mensagem }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
