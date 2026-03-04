import { ContextoSCAE } from '../../tipos/ambiente';

/**
 * Lista todos os usuários cadastrados globalmente.
 * Restrito a administradores globais (CENTRAL).
 */
export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const { env } = contexto;

    try {
        const usuarios = await env.DB_SCAE.prepare(
            `SELECT 
                u.id, 
                u.email, 
                u.nome, 
                u.papel, 
                t.nome_escola,
                u.criado_em as ultimoAcesso -- Placeholder para último acesso real
             FROM usuarios u
             LEFT JOIN escolas t ON u.escola_id = t.id
             ORDER BY u.criado_em DESC`
        ).all();

        return new Response(JSON.stringify({ dados: usuarios.results }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (erro) {
        console.error('Erro ao listar usuários globalmente:', erro);
        return new Response(JSON.stringify({ erro: 'Falha ao buscar contas de usuários.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

