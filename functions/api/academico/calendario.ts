import type { ContextoCatraki } from '../../tipos/ambiente';
import { ErroBase, ErroValidacao, ErroInterno } from '../erros';
import { extrairEscolaId, verificarPermissao } from '../_seguranca';
import { CALENDARIO_SEEDF_2026, obterDiasNaoLetivos } from './calendario.compartilhado';

interface EscolaDominio {
    dominio_email: string | null;
}

export async function onRequestGet(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA']);

        // Busca dias manuais configurados pela escola
        const { results: diasManuais } = await contexto.env.DB_CATRAKI.prepare(
            `SELECT data, escola_id, descricao, tipo FROM calendario_letivo WHERE escola_id = ? ORDER BY data ASC`
        ).bind(idEscola).all();

        if (diasManuais && diasManuais.length > 0) {
            return Response.json({
                dados: diasManuais,
                mensagem: 'Calendário letivo carregado (configuração manual)'
            });
        }

        // Fallback: calendário SEEDF para escolas do DF
        const escola = await contexto.env.DB_CATRAKI.prepare(
            `SELECT dominio_email FROM escolas WHERE id = ?`
        ).bind(idEscola).first<EscolaDominio>();

        if (escola?.dominio_email?.includes('se.df.gov.br')) {
            return Response.json({
                dados: CALENDARIO_SEEDF_2026.map(d => ({ ...d, escola_id: idEscola })),
                mensagem: 'Calendário letivo carregado (SEEDF 2026)'
            });
        }

        return Response.json({
            dados: [],
            mensagem: 'Nenhum calendário letivo configurado'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar calendário');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

export async function onRequestPost(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

        const { searchParams } = new URL(contexto.request.url);
        const acao = searchParams.get('acao');

        if (acao === 'sincronizar_seedf') {
            const stmt = contexto.env.DB_CATRAKI.prepare(
                `INSERT OR REPLACE INTO calendario_letivo (data, escola_id, descricao, tipo)
                 VALUES (?, ?, ?, ?)`
            );

            await contexto.env.DB_CATRAKI.batch(
                CALENDARIO_SEEDF_2026.map(d => stmt.bind(d.data, idEscola, d.descricao, d.tipo))
            );

            return Response.json({
                dados: { total: CALENDARIO_SEEDF_2026.length },
                mensagem: 'Calendário SEEDF sincronizado com sucesso'
            });
        }

        let dados: { data?: string; descricao?: string; tipo?: string };
        try {
            dados = await contexto.request.json();
        } catch {
            throw new ErroValidacao('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR');
        }

        if (!dados.data) {
            throw new ErroValidacao('Data é obrigatória', 'CALENDARIO_DATA_AUSENTE');
        }

        await contexto.env.DB_CATRAKI.prepare(
            `INSERT OR REPLACE INTO calendario_letivo (data, escola_id, descricao, tipo)
             VALUES (?, ?, ?, ?)`
        ).bind(dados.data, idEscola, dados.descricao || '', dados.tipo || 'FERIADO').run();

        return Response.json({
            dados: { data: dados.data },
            mensagem: 'Data adicionada ao calendário'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao salvar no calendário');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

export async function onRequestDelete(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

        const { searchParams } = new URL(contexto.request.url);
        const data = searchParams.get('data');

        if (!data) {
            throw new ErroValidacao('Data é obrigatória para remoção', 'CALENDARIO_DATA_AUSENTE');
        }

        await contexto.env.DB_CATRAKI.prepare(
            `DELETE FROM calendario_letivo WHERE data = ? AND escola_id = ?`
        ).bind(data, idEscola).run();

        return Response.json({
            dados: { data },
            mensagem: 'Data removida do calendário'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao remover do calendário');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
