import type { ContextoCatraki } from '../../tipos/ambiente';
import { ErroBase, ErroInterno, ErroValidacao, ErroNaoEncontrado } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../_seguranca';
import { ServicoCache } from '../utilitarios/cache';

export async function onRequestGet(contexto: ContextoCatraki): Promise<Response> {
    try {
        const escolaId = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

        const escola = await contexto.env.DB_SCAE.prepare(`
            SELECT config_qr_dinamico, tts_ativado, saida_obrigatoria, metodo_acesso, cor_primaria, cor_secundaria, logo_url 
            FROM escolas WHERE id = ?
        `).bind(escolaId).first<{
            config_qr_dinamico: number;
            tts_ativado: number;
            saida_obrigatoria: number;
            metodo_acesso: string;
            cor_primaria: string;
            cor_secundaria: string;
            logo_url: string;
        }>();

        if (!escola) {
            throw new ErroNaoEncontrado('Escola não encontrada.');
        }

        return Response.json({
            dados: {
                qrDinamico: Boolean(escola.config_qr_dinamico),
                ttsAtivado: Boolean(escola.tts_ativado),
                saidaObrigatoria: Boolean(escola.saida_obrigatoria),
                metodoAcesso: escola.metodo_acesso || 'QRCODE',
                corPrimaria: escola.cor_primaria,
                corSecundaria: escola.cor_secundaria,
                logoUrl: escola.logo_url
            },
            mensagem: 'Configurações carregadas.'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao carregar configurações');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

export async function onRequestPatch(contexto: ContextoCatraki): Promise<Response> {
    try {
        const escolaId = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

        let corpo: Record<string, any>;
        try {
            corpo = await contexto.request.json();
        } catch {
            throw new ErroValidacao('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR');
        }

        const queryParts: string[] = [];
        const binds: (string | number)[] = [];

        if (corpo.qrDinamico !== undefined) {
            queryParts.push("config_qr_dinamico = ?");
            binds.push(corpo.qrDinamico ? 1 : 0);
        }

        if (corpo.ttsAtivado !== undefined) {
            queryParts.push("tts_ativado = ?");
            binds.push(corpo.ttsAtivado ? 1 : 0);
        }

        if (corpo.saidaObrigatoria !== undefined) {
            queryParts.push("saida_obrigatoria = ?");
            binds.push(corpo.saidaObrigatoria ? 1 : 0);
        }

        if (corpo.metodoAcesso !== undefined) {
            const modos_permitidos = ['QRCODE', 'DIGITAL'];
            if (typeof corpo.metodoAcesso === 'string' && modos_permitidos.includes(corpo.metodoAcesso)) {
                queryParts.push("metodo_acesso = ?");
                binds.push(corpo.metodoAcesso);
            }
        }

        if (queryParts.length === 0) {
            throw new ErroValidacao('Nenhum campo para atualizar.', 'CONFIG_VAZIA');
        }

        binds.push(escolaId);
        
        const sql = `UPDATE escolas SET ${queryParts.join(', ')} WHERE id = ?`;

        const resultado = await contexto.env.DB_SCAE.prepare(sql).bind(...binds).run();

        if (resultado.meta.changes === 0) {
            throw new ErroNaoEncontrado('Escola não encontrada para atualizar.');
        }

        await ServicoCache.limparCacheEscola(escolaId, contexto.env);

        return Response.json({
            dados: { escolaId },
            mensagem: 'Configurações atualizadas com sucesso.'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao atualizar configurações');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
