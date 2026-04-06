/**
 * api/agente/download-alunos.ts
 * Fornece a base de alunos da escola para o Agente Local fazer cache offline.
 * Limpeza total: TTS e configs foram removidos para recriação do zero.
 */
import { ContextoCatraki } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

export async function onRequestGet({ request, env }: ContextoCatraki) {
    const escolaId = validarAgente(request, env);
    const { DB_SCAE: db } = env;

    try {
        const alunos = await db.prepare(`
            SELECT a.matricula, a.nome_completo, a.turma_id, a.ativo, a.biometria_cadastrada
            FROM alunos a
            WHERE a.escola_id = ? AND a.ativo = 1
        `).bind(escolaId).all();

        const escolaInfo = await db.prepare(`
            SELECT nome_escola, tts_ativado, 
                   COALESCE(config_tts_frase_sucesso, '') as config_tts_frase_sucesso, 
                   COALESCE(config_tts_frase_erro, '') as config_tts_frase_erro
            FROM escolas
            WHERE id = ?
        `).bind(escolaId).first();

        const dataObj = {
            escola_config: escolaInfo || {},
            alunos: alunos.results,
            total: alunos.results.length
        };

        // Gera um ETag simples (contagem de alunos + hash de configs)
        const etag = `W/"${dataObj.total}-${JSON.stringify(dataObj.escola_config).length}"`;
        
        if (request.headers.get('If-None-Match') === etag) {
            return new Response(null, { status: 304 });
        }

        return Response.json({
            ok: true,
            ...dataObj,
            etag,
            timestamp_servidor: new Date().toISOString()
        }, {
            headers: { 'ETag': etag }
        });

    } catch (e: any) {
        console.error('[Agente] Erro Download-ALUNOS:', e.message);
        return Response.json({
            erro: 'Falha ao buscar alunos.',
            detalhe: e.message
        }, { status: 500 });
    }
}
