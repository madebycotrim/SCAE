/**
 * api/agente/download-alunos.ts
 * Fornece a base de alunos da escola para o Agente Local fazer cache offline.
 */
import { ContextoCatraki } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

export async function onRequestGet({ request, env }: ContextoCatraki) {
    // 1. Validar segurança (Token + Escola ID)
    const escolaId = validarAgente(request, env);
    const { DB_SCAE: db } = env;

    try {
        // 2. Busca alunos ativos
        const alunos = await db.prepare(`
            SELECT a.matricula, a.nome_completo, a.turma_id, a.ativo, a.biometria_cadastrada
            FROM alunos a
            WHERE a.escola_id = ? AND a.ativo = 1
        `).bind(escolaId).all();

        // 3. Busca configurações da unidade
        const configs = await db.prepare(`
            SELECT config_qr_dinamico, tts_ativado, config_tts_frase_sucesso, config_tts_frase_erro
            FROM escolas
            WHERE slug = ?
        `).bind(escolaId).first();

        return Response.json({
            ok: true,
            alunos: alunos.results,
            configuracoes: {
                qrDinamico: !!configs?.config_qr_dinamico,
                ttsAtivado: !!configs?.tts_ativado,
                ttsFraseSucesso: configs?.config_tts_frase_sucesso || 'Bem-vindo, {nome}!',
                ttsFraseErro: configs?.config_tts_frase_erro || 'Acesso negado.'
            },
            total: alunos.results.length,
            timestamp_servidor: new Date().toISOString()
        });

    } catch (e: any) {
        console.error('[Agente] Erro Download-ALUNOS:', e.message);
        return Response.json({
            erro: 'Falha ao buscar alunos nas tabelas do sistema.',
            detalhe: e.message
        }, { status: 500 });
    }
}
