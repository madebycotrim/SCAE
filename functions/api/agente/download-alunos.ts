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
        // Selecionar alunos ativos (Removido JOIN com descritores faciais — Purga Facial)
        const alunos = await db.prepare(`
            SELECT a.matricula, a.nome_completo, a.turma_id, a.ativo
            FROM alunos a
            WHERE a.escola_id = ? AND a.ativo = 1
        `).bind(escolaId).all();

        return Response.json({
            ok: true,
            alunos: alunos.results,
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
