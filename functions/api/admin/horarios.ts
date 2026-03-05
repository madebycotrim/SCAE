import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroValidacao, ErroNaoEncontrado } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../seguranca';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const escolaId = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

    const result = await contexto.env.DB_SCAE.prepare(`
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
}

export async function onRequestPatch(contexto: ContextoSCAE): Promise<Response> {
    const escolaId = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

    const corpo = await contexto.request.json() as { janelas: any[] };

    if (!corpo || !Array.isArray(corpo.janelas)) {
        throw new ErroValidacao('O payload precisa conter um array "janelas".');
    }

    const janelasJson = JSON.stringify(corpo.janelas);

    const resultado = await contexto.env.DB_SCAE.prepare(`
        UPDATE escolas SET janelas = ? WHERE id = ?
    `).bind(janelasJson, escolaId).run();

    if (resultado.meta.changes === 0) {
        throw new ErroNaoEncontrado('Escola não encontrada para atualizar.');
    }

    return Response.json({
        dados: { escolaId },
        mensagem: 'Horários da portaria atualizados com sucesso.'
    });
}
