import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroValidacao, ErroNaoEncontrado } from '../erros';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const url = new URL(contexto.request.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
        throw new ErroValidacao('Slug da escola ausente');
    }

    const escola = await contexto.env.DB_SCAE.prepare(
        "SELECT id, nome_escola as nomeEscola, dominio_email as dominioEmail, cor_primaria as corPrimaria, cor_secundaria as corSecundaria, tts_ativado as ttsAtivado FROM escolas WHERE id = ?"
    ).bind(slug).first<{ ttsAtivado: number }>();

    if (!escola) {
        throw new ErroNaoEncontrado('Escola não encontrada');
    }

    return Response.json({
        dados: {
            ...escola,
            ttsAtivado: Boolean(escola.ttsAtivado)
        },
        mensagem: 'Perfil da escola carregado'
    }, {
        headers: { 'Cache-Control': 'public, max-age=3600' }
    });
}
