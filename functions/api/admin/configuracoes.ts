import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroValidacao, ErroNaoEncontrado } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../seguranca';
import { ServicoCache } from '../utilitarios/cache';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const escolaId = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

    const escola = await contexto.env.DB_SCAE.prepare(`
        SELECT config_qr_dinamico, tts_ativado, cor_primaria, cor_secundaria, logo_url 
        FROM escolas WHERE id = ?
    `).bind(escolaId).first<any>();

    if (!escola) {
        throw new ErroNaoEncontrado('Escola não encontrada.');
    }

    return Response.json({
        dados: {
            qrDinamico: Boolean(escola.config_qr_dinamico),
            ttsAtivado: Boolean(escola.tts_ativado),
            corPrimaria: escola.cor_primaria,
            corSecundaria: escola.cor_secundaria,
            logoUrl: escola.logo_url
        },
        mensagem: 'Configurações carregadas.'
    });
}

export async function onRequestPatch(contexto: ContextoSCAE): Promise<Response> {
    const escolaId = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

    const corpo = await contexto.request.json() as any;

    // Atualiza apenas os campos permitidos
    const camposPermitidos = ['qrDinamico', 'ttsAtivado'];
    const queryParts: string[] = [];
    const binds: any[] = [];

    if (corpo.qrDinamico !== undefined) {
        queryParts.push("config_qr_dinamico = ?");
        binds.push(corpo.qrDinamico ? 1 : 0);
    }

    if (corpo.ttsAtivado !== undefined) {
        queryParts.push("tts_ativado = ?");
        binds.push(corpo.ttsAtivado ? 1 : 0);
    }

    if (queryParts.length === 0) {
        throw new ErroValidacao('Nenhum campo para atualizar.');
    }

    binds.push(escolaId);
    
    const sql = `UPDATE escolas SET ${queryParts.join(', ')} WHERE id = ?`;

    const resultado = await contexto.env.DB_SCAE.prepare(sql).bind(...binds).run();

    if (resultado.meta.changes === 0) {
        throw new ErroNaoEncontrado('Escola não encontrada para atualizar.');
    }

    // Invalida o cache para que as mudanças reflitam imediatamente
    await ServicoCache.limparCacheEscola(escolaId, contexto.env);

    return Response.json({
        dados: { escolaId },
        mensagem: 'Configurações atualizadas com sucesso.'
    });
}
