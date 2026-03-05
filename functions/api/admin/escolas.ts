import type { ContextoSCAE } from '../../tipos/ambiente';
import { verificarPermissao } from '../seguranca';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const { env } = contexto;
    // RBAC: Apenas admins globais podem listar todas as escolas
    verificarPermissao(contexto, ['ADMIN']);

    const escolas = await env.DB_SCAE.prepare(`
        SELECT 
            id, 
            nome_escola as nomeEscola, 
            dominio_email as dominioEmail,
            (SELECT COUNT(*) FROM alunos WHERE escola_id = escolas.id) as totalAlunos
            FROM escolas 
            ORDER BY criado_em DESC`
    ).all();

    return Response.json({
        dados: escolas.results,
        mensagem: 'Lista de escolas carregada'
    });
}

