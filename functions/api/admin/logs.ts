import type { ContextoCatraki } from '../../tipos/ambiente';
import { ErroBase, ErroInterno } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../_seguranca';

export async function onRequestGet(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN']);

        const { results } = await contexto.env.DB_CATRAKI.prepare(
            `SELECT
                a.id,
                a.escola_id,
                a.usuario_email,
                a.acao,
                a.entidade_tipo,
                a.entidade_id,
                a.dados_anteriores,
                a.dados_novos,
                a.ip_address,
                a.user_agent,
                a.criado_em,
                e.nome_escola,
                u.nome_completo as usuario_nome
            FROM logs_auditoria a
            LEFT JOIN escolas e ON a.escola_id = e.id
            LEFT JOIN (
                SELECT email, nome_completo, ROW_NUMBER() OVER(PARTITION BY email ORDER BY atualizado_em DESC) as rn
                FROM usuarios
            ) u ON a.usuario_email = u.email AND u.rn = 1
            WHERE a.escola_id = ?
            ORDER BY a.criado_em DESC
            LIMIT 100`
        ).bind(idEscola).all();

        return Response.json({
            dados: results,
            mensagem: 'Logs de auditoria carregados'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar logs');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
