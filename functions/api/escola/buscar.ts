/**
 * API pública para buscar escolas pelo nome ou slug.
 * Caminho: GET /api/escola/buscar?q=termo
 * Rota pública — não exige autenticação.
 * Retorna apenas dados públicos: id (slug) e nome.
 */
import type { ContextoSCAE } from '../../tipos/ambiente';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        const url = new URL(contexto.request.url);
        const termo = url.searchParams.get('q')?.trim() || '';

        // Sem termo de busca → retorna todas as escolas cadastradas
        if (termo.length < 2) {
            const todas = await contexto.env.DB_SCAE.prepare(
                `SELECT id, nome_escola as nome FROM escolas ORDER BY nome_escola ASC LIMIT 50`
            ).all();

            return new Response(JSON.stringify({ dados: todas.results }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=300'
                }
            });
        }

        // Busca por nome ou slug — retorna apenas dados públicos (sem domínio, sem cores)
        const resultado = await contexto.env.DB_SCAE.prepare(
            `SELECT id, nome_escola as nome
             FROM escolas
             WHERE nome_escola LIKE ?1 OR id LIKE ?1
             ORDER BY nome_escola ASC
             LIMIT 10`
        ).bind(`%${termo}%`).all();

        return new Response(JSON.stringify({ dados: resultado.results }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300'
            }
        });

    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro interno';
        return new Response(JSON.stringify({ erro: mensagem }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
