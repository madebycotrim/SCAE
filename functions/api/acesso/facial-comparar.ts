/**
 * api/acesso/facial-comparar.ts
 * Fallback de reconhecimento facial na nuvem (Cloud-based Matching).
 * Usado quando o Agente Local está offline ou em dispositivos móveis.
 */

import { ContextoCatraki } from '../../tipos/ambiente';
import { extrairEscolaId, verificarAcesso } from '../_seguranca';
import { Permissao } from '../seguranca/rbac';
import { ErroValidacao } from '../erros';

export async function onRequestPost({ request, env }: ContextoCatraki) {
    const idEscola = extrairEscolaId(request);
    // Permissão para bater ponto via facial
    verificarAcesso({ request, env } as any, Permissao.REGISTRAR_ACESSO);

    const { vetor_facial: vetorBusca } = await request.json() as { vetor_facial: number[] };

    if (!Array.isArray(vetorBusca) || vetorBusca.length !== 128) {
        throw new ErroValidacao('Vetor facial de busca inválido (Esperado 128d)');
    }

    const { DB_SCAE: db } = env;

    try {
        // 1. Buscar todos os descritores ativos da escola
        // Otimização: Em escolas gigantes, poderíamos usar um índice vetorial (Vector Search),
        // mas para escolas comuns (~1000 alunos), o cálculo em memória no Worker é instantâneo.
        const res = await db.prepare(`
            SELECT aluno_matricula, vetor_facial 
            FROM descritores_faciais 
            WHERE escola_id = ?
        `).bind(idEscola).all();

        const descritores = res.results as { aluno_matricula: string, vetor_facial: string }[];
        
        let melhorMatch: string | null = null;
        let menorDistancia = 0.6; // Threshold padrão do face-api (0.6)

        // 2. Cálculo de Distância Euclidiana (L2) no Worker
        for (const d of descritores) {
            try {
                const vetorAlvo = JSON.parse(d.vetor_facial) as number[];
                const distancia = calcularDistanciaEuclidiana(vetorBusca, vetorAlvo);

                if (distancia < menorDistancia) {
                    menorDistancia = distancia;
                    melhorMatch = d.aluno_matricula;
                }
            } catch (e) { continue; }
        }

        if (!melhorMatch) {
            return Response.json({ ok: false, mensagem: 'Face não reconhecida.' }, { status: 404 });
        }

        // 3. Buscar nome do aluno para o feedback
        const aluno = await db.prepare('SELECT nome_completo FROM alunos WHERE matricula = ? AND escola_id = ?')
                               .bind(melhorMatch, idEscola).first() as any;

        return Response.json({
            ok: true,
            matricula: melhorMatch,
            nome: aluno?.nome_completo || 'Aluno Identificado',
            distancia: menorDistancia.toFixed(4)
        });

    } catch (e: any) {
        return Response.json({ erro: 'Erro no processamento facial nuvem', detalhe: e.message }, { status: 500 });
    }
}

function calcularDistanciaEuclidiana(v1: number[], v2: number[]): number {
    return Math.sqrt(v1.reduce((sum, val, i) => sum + Math.pow(val - v2[i], 2), 0));
}
