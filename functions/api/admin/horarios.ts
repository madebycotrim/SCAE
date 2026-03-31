import type { ContextoCatraki } from '../../tipos/ambiente';
import { ErroBase, ErroInterno, ErroValidacao, ErroNaoEncontrado } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../_seguranca';

export async function onRequestGet(contexto: ContextoCatraki): Promise<Response> {
    try {
        const escolaId = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

        const result = await contexto.env.DB_CATRAKI.prepare(`
            SELECT janelas FROM escolas WHERE id = ?
        `).bind(escolaId).first<{ janelas: string }>();

        if (!result || !result.janelas) {
            return Response.json({
                dados: { janelas: [] },
                mensagem: 'Configuração vazia'
            });
        }

        return Response.json({
            dados: { janelas: JSON.parse(result.janelas) },
            mensagem: 'Horários carregados'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao carregar horários');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

export async function onRequestPatch(contexto: ContextoCatraki): Promise<Response> {
    try {
        const escolaId = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

        let corpo: { janelas?: unknown[] };
        try {
            corpo = await contexto.request.json();
        } catch {
            throw new ErroValidacao('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR');
        }

        if (!corpo || !Array.isArray(corpo.janelas)) {
            throw new ErroValidacao('O payload precisa conter um array "janelas".', 'HORARIO_VALIDACAO_001');
        }

        const janelasJson = JSON.stringify(corpo.janelas);

        const resultado = await contexto.env.DB_CATRAKI.prepare(`
            UPDATE escolas SET janelas = ? WHERE id = ?
        `).bind(janelasJson, escolaId).run();

        if (resultado.meta.changes === 0) {
            throw new ErroNaoEncontrado('Escola não encontrada para atualizar.');
        }

        return Response.json({
            dados: { escolaId },
            mensagem: 'Horários da portaria atualizados com sucesso.'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao atualizar horários');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
