/**
 * functions/api/acesso/faltas.ts
 * Cálculo dinâmico de ausências (Alunos que não bateram ponto).
 */

import type { ContextoCatraki } from '../../tipos/ambiente';
import { extrairEscolaId } from '../_seguranca';

export async function onRequestGet(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        const { searchParams } = new URL(contexto.request.url);
        
        // Data alvo (hoje por padrão YYYY-MM-DD)
        const dataAlvo = searchParams.get('data') || new Date().toISOString().split('T')[0];

        // 1. Buscar todos os alunos ativos da escola
        const alunosAtivos = await contexto.env.DB_SCAE.prepare(
            `SELECT matricula, nome_completo, turma_id FROM alunos 
             WHERE escola_id = ? AND ativo = 1`
        ).bind(idEscola).all<any>();

        // 2. Buscar matrículas que bateram ponto hoje (ENTRADA)
        const presencas = await contexto.env.DB_SCAE.prepare(
            `SELECT DISTINCT aluno_matricula FROM registros_acesso 
             WHERE escola_id = ? 
             AND substr(timestamp_acesso, 1, 10) = ?
             AND tipo_movimentacao = 'ENTRADA'`
        ).bind(idEscola, dataAlvo).all<any>();

        const matriculasPresentes = new Set(presencas.results.map(p => p.aluno_matricula));

        // 3. Cruzar dados para encontrar faltosos
        const faltosos = alunosAtivos.results.filter(aluno => !matriculasPresentes.has(aluno.matricula));

        return Response.json({
            ok: true,
            data: dataAlvo,
            total_ativos: alunosAtivos.results.length,
            total_presentes: matriculasPresentes.size,
            total_faltas: faltosos.length,
            faltosos: faltosos,
            mensagem: 'Cálculo de ausências concluído'
        });

    } catch (e: any) {
        return Response.json({ ok: false, mensagem: 'Erro ao calcular faltas', erro: e.message }, { status: 500 });
    }
}
