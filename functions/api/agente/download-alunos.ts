/**
 * api/agente/download-alunos.ts
 * Fornece a base de alunos da escola para o Agente Local fazer cache offline.
 */
import { ContextoSCAE } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

export async function onRequestGet({ request, env }: ContextoSCAE) {
    // 1. Validar segurança (Token + Escola ID)
    const escolaId = validarAgente(request, env);
    
    // 2. Extrair dados da escola no D1
    const { DB_SCAE: db } = env;

    try {
        // Selecionar alunos ativos E seus descritores faciais (se houver) via JOIN
        const alunos = await db.prepare(`
            SELECT a.matricula, a.nome_completo, a.turma_id, a.ativo, d.vetor_facial
            FROM alunos a
            LEFT JOIN descritores_faciais d ON a.matricula = d.aluno_matricula AND a.escola_id = d.escola_id
            WHERE a.escola_id = ? AND a.ativo = 1
        `).bind(escolaId).all();

        console.log(`[Agente] Download-ALUNOS+BIO: Escola ${escolaId} baixou ${alunos.results.length} matriculas.`);

        return Response.json({
            ok: true,
            alunos: alunos.results,
            total: alunos.results.length,
            timestamp_servidor: new Date().toISOString()
        });

    } catch (e: any) {
        console.error('[Agente] Erro crítico no Download-ALUNOS:', e.message);
        return Response.json({
            erro: 'Falha ao buscar alunos nas tabelas do sistema.',
            detalhe: e.message
        }, { status: 500 });
    }
}
