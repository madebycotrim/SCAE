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
            SELECT nome_escola, tts_ativado, config_tts_frase_sucesso, config_tts_frase_erro
            FROM escolas
            WHERE id = ?
        `).bind(escolaId).first();

        return Response.json({
            ok: true,
            escola_config: escolaInfo || {},
            alunos: alunos.results,
            total: alunos.results.length,
            timestamp_servidor: new Date().toISOString()
        });

    } catch (e: any) {
        console.error('[Agente] Erro Download-ALUNOS:', e.message);
        return Response.json({
            erro: 'Falha ao buscar alunos.',
            detalhe: e.message
        }, { status: 500 });
    }
}
