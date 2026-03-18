/**
 * API de Descritores Faciais
 * 
 * POST   /api/academico/facial   — Salvar descritores de um aluno
 * GET    /api/academico/facial   — Buscar todos descritores da escola (para cache do tablet)
 * DELETE /api/academico/facial   — Remover descritores de um aluno
 * 
 * LGPD Art. 11 — Dado biometrico sensivel
 * Os descritores sao vetores numericos 128d, NUNCA fotos.
 */
import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase } from '../erros';
import { verificarPermissao } from '../_seguranca';

/**
 * GET /api/academico/facial?escola_id=xxx
 * Retorna todos os descritores faciais da escola para cache local do tablet.
 */
export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'PORTEIRO', 'CENTRAL']);

        const url = new URL(contexto.request.url);
        const escolaId = url.searchParams.get('escola_id');

        if (!escolaId) {
            throw new ErroBase('escola_id obrigatorio', 'VALIDACAO_FALHA', 400);
        }

        const { results } = await contexto.env.DB_SCAE.prepare(`
            SELECT aluno_matricula as matricula, descritores
            FROM descritores_faciais
            WHERE escola_id = ?
        `).bind(escolaId).all();

        // Parsear JSON dos descritores
        const dados = results.map((r: any) => ({
            matricula: r.matricula,
            descritores: JSON.parse(r.descritores)
        }));

        return new Response(JSON.stringify({ dados }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (erro) {
        return tratarErro(erro);
    }
}

/**
 * POST /api/academico/facial
 * Body: { escola_id, matricula, descritores: number[][] }
 * Salva ou atualiza os descritores faciais de um aluno.
 */
export async function onRequestPost(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'CENTRAL']);

        const dados = await contexto.request.json() as any;
        const { escola_id, matricula, descritores } = dados;

        if (!escola_id || !matricula || !descritores || !Array.isArray(descritores)) {
            throw new ErroBase('Campos obrigatorios: escola_id, matricula, descritores', 'VALIDACAO_FALHA', 400);
        }

        // Upsert — INSERT OR REPLACE
        await contexto.env.DB_SCAE.prepare(`
            INSERT OR REPLACE INTO descritores_faciais (aluno_matricula, escola_id, descritores, atualizado_em)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(matricula, escola_id, JSON.stringify(descritores)).run();

        return new Response(JSON.stringify({ mensagem: 'Descritores faciais salvos com sucesso.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (erro) {
        return tratarErro(erro);
    }
}

/**
 * DELETE /api/academico/facial
 * Body: { escola_id, matricula }
 * Remove os descritores faciais de um aluno.
 */
export async function onRequestDelete(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'CENTRAL']);

        const dados = await contexto.request.json() as any;
        const { escola_id, matricula } = dados;

        if (!escola_id || !matricula) {
            throw new ErroBase('Campos obrigatorios: escola_id, matricula', 'VALIDACAO_FALHA', 400);
        }

        await contexto.env.DB_SCAE.prepare(`
            DELETE FROM descritores_faciais WHERE aluno_matricula = ? AND escola_id = ?
        `).bind(matricula, escola_id).run();

        return new Response(JSON.stringify({ mensagem: 'Descritores removidos.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (erro) {
        return tratarErro(erro);
    }
}

function tratarErro(erro: any) {
    console.error('[API Facial] Erro:', erro);
    if (erro instanceof ErroBase) {
        return new Response(JSON.stringify(erro.toJSON()), {
            status: erro.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    return new Response(JSON.stringify({ erro: 'Erro interno' }), { status: 500 });
}
