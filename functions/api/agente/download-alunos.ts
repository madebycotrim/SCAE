/**
 * api/agente/download-alunos.ts
 * Fornece a base de alunos da escola para o Agente Local fazer cache offline.
 * Limpeza total: TTS e configs foram removidos para recriação do zero.
 */
import { ContextoCatraki } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

export async function onRequestGet(contexto: ContextoCatraki) {
    const escolaId = validarAgente(contexto.request, contexto.env);
    const { DB_SCAE: db } = contexto.env;

    try {
        // 1. Busca Alunos com seus Turnos (via join com turmas)
        const alunos = await db.prepare(`
            SELECT a.matricula, a.nome_completo, a.turma_id, t.turno, a.ativo, a.biometria_cadastrada
            FROM alunos a
            LEFT JOIN turmas t ON a.turma_id = t.id AND a.escola_id = t.escola_id
            WHERE a.escola_id = ? AND a.ativo = 1
        `).bind(escolaId).all();

        // 2. Busca Configurações da Escola (incluindo Janelas de Horário)
        const escolaInfo = await db.prepare(`
            SELECT nome_escola, tts_ativado, janelas,
                   COALESCE(config_tts_frase_sucesso, '') as config_tts_frase_sucesso, 
                   COALESCE(config_tts_frase_erro, '') as config_tts_frase_erro
            FROM escolas
            WHERE id = ?
        `).bind(escolaId).first();

        // 3. Busca lista de Turmas para o Agente ter o mapa completo se precisar
        const turmas = await db.prepare(`
            SELECT id, serie, letra, turno FROM turmas WHERE escola_id = ?
        `).bind(escolaId).all();

        const escolaRetorno = (escolaInfo as any) || {};

        const dataObj = {
            escola_config: {
                ...escolaRetorno,
                janelas: escolaRetorno.janelas ? JSON.parse(escolaRetorno.janelas as string) : []
            },
            alunos: alunos.results,
            turmas: turmas.results,
            total: alunos.results.length
        };

        // Gera um ETag simples (contagem de alunos + hash de configs)
        const etag = `W/"${dataObj.total}-${JSON.stringify(dataObj.escola_config).length}"`;
        
        if (contexto.request.headers.get('If-None-Match') === etag) {
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
