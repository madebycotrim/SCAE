import type { ContextoSCAE } from '../../tipos/ambiente';

/**
 * Lista todos os escolas cadastradas no sistema.
 * Restrito a administradores globais (CENTRAL).
 */
export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const { env } = contexto;

    try {
        // Rotas de CENTRAL não filtram por escola_id no header, pois gerenciam todas
        const escolas = await env.DB_SCAE.prepare(`
            SELECT 
                id, 
                nome_escola as nomeEscola, 
                dominio_email as dominioEmail,
                (SELECT COUNT(*) FROM alunos WHERE escola_id = escolas.id) as totalAlunos
             FROM escolas 
             ORDER BY criado_em DESC`
        ).all();

        return new Response(JSON.stringify({ dados: escolas.results }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (erro) {
        console.error('Erro ao listar escolas:', erro);
        return new Response(JSON.stringify({ error: 'Erro interno ao listar escolas' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

