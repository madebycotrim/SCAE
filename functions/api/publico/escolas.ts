import type { ContextoSCAE } from '../../tipos/ambiente';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const url = new URL(contexto.request.url);
    const termo = url.searchParams.get('q')?.trim() || '';

    let results: any[];

    if (termo.length < 2) {
        const todas = await contexto.env.DB_SCAE.prepare(
            `SELECT id, nome_escola as nome FROM escolas ORDER BY nome_escola ASC LIMIT 50`
        ).all();
        results = todas.results;
    } else {
        const buscadas = await contexto.env.DB_SCAE.prepare(
            `SELECT id, nome_escola as nome FROM escolas WHERE nome_escola LIKE ?1 OR id LIKE ?1 ORDER BY nome_escola ASC LIMIT 10`
        ).bind(`%${termo}%`).all();
        results = buscadas.results;
    }

    return Response.json({
        dados: results,
        mensagem: 'Escolas encontradas'
    }, {
        headers: { 'Cache-Control': 'public, max-age=300' }
    });
}
