// functions/api/configuracao/[escola_id]/horarios.ts
import type { AmbienteSCAE } from '../../../tipos/ambiente';

/**
 * Endpoint para buscar ou salvar configurações de horários de uma escola.
 * Rota: /api/configuracao/:escola_id/horarios
 */

export async function onRequestGet({ request, env, params }: { request: Request, env: AmbienteSCAE, params: Record<string, string> }): Promise<Response> {
    try {
        const escolaId = params.escola_id as string;
        if (!escolaId) {
            return new Response('ID da escola não fornecido.', { status: 400 });
        }

        // 1. Busca no D1
        const stmt = env.DB_SCAE.prepare(`
            SELECT janelas FROM escolas WHERE id = ?
        `).bind(escolaId);

        const result = await stmt.first<{ janelas: string }>();

        // Se não existir a escola ou não tiver configuração preenchida, retornar array vazio
        if (!result || !result.janelas) {
            return Response.json({ janelas: [] });
        }

        // Converter string JSON de volta para Array
        const janelasFormatadas = JSON.parse(result.janelas);

        return Response.json({ janelas: janelasFormatadas });
    } catch (erro: any) {
        return new Response(`Erro ao buscar horários: ${erro.message}`, { status: 500 });
    }
}

export async function onRequestPatch({ request, env, params }: { request: Request, env: AmbienteSCAE, params: Record<string, string> }): Promise<Response> {
    try {
        const escolaId = params.escola_id as string;
        if (!escolaId) {
            return new Response('ID da escola não fornecido.', { status: 400 });
        }

        const corpo = await request.json() as { janelas: any[] };

        if (!corpo || !Array.isArray(corpo.janelas)) {
            return new Response('O payload precisa conter um array "janelas".', { status: 400 });
        }

        // Converter janelas para string JSON
        const janelasJson = JSON.stringify(corpo.janelas);

        const stmt = env.DB_SCAE.prepare(`
            UPDATE escolas SET janelas = ? WHERE id = ?
        `).bind(janelasJson, escolaId);

        const resultado = await stmt.run();

        if (resultado.meta.changes === 0) {
            return new Response('Escola não encontrada para atualizar.', { status: 404 });
        }

        return Response.json({
            mensagem: 'Horários da portaria atualizados com sucesso.',
            escola_id: escolaId
        });
    } catch (erro: any) {
        return new Response(`Erro ao atualizar horários: ${erro.message}`, { status: 500 });
    }
}
