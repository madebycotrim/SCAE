import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase, ErroInterno } from '../erros';
import { verificarPermissao } from '../seguranca';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);

        const { results } = await contexto.env.DB_SCAE.prepare(`
            SELECT 
                id, 
                nome_escola as nome, 
                id as slug, 
                (SELECT COUNT(*) FROM alunos WHERE escola_id = escolas.id) as totalAlunos,
                'ATIVA' as status,
                criado_em as criadoEm
            FROM escolas
            ORDER BY criado_em DESC
        `).all();

        return new Response(JSON.stringify({ dados: results }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
            }
        });

    } catch (erro) {
        console.error('Erro ao buscar escolas central:', erro);
        if (erro instanceof ErroBase) {
            return new Response(JSON.stringify(erro.toJSON()), { 
                status: erro.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro interno ao buscar escolas');
        return new Response(JSON.stringify(erroInterno.toJSON()), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
