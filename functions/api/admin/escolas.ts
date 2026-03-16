import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase, ErroInterno } from '../erros';
import { verificarPermissao } from '../seguranca';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        // RBAC: Apenas admins globais podem listar todas as escolas
        verificarPermissao(contexto, ['ADMIN', 'CENTRAL']);

        try {
            const escolas = await contexto.env.DB_SCAE.prepare(`
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
        } catch (dbError) {
            throw new ErroInterno(`Falha ao buscar escolas: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar escolas');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

