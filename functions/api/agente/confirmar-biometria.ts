import { ContextoCatraki } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

/**
 * Confirma o registro da biometria de um aluno no hardware local
 * e atualiza o status no banco de dados Cloud (D1).
 */
export async function onRequestPost(contexto: ContextoCatraki): Promise<Response> {
    const { request, env } = contexto;

    try {
        // Valida token do agente OU sessão administrativa e extrai escola_id dos headers
        const escolaId = validarAgente(request, env, contexto.data);
        
        const { matricula } = await request.json() as { matricula: string };

        if (!matricula) {
            return new Response(JSON.stringify({ ok: false, erro: 'Matrícula não informada.' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Atualiza biometria_cadastrada no banco central (D1)
        // ⚡ MELHORIA: LTRIM remove os zeros à esquerda para garantir que '099803' == '99803' no SQLite
        const res = await env.DB_SCAE.prepare(`
            UPDATE alunos 
            SET biometria_cadastrada = 1, atualizado_em = CURRENT_TIMESTAMP
            WHERE LTRIM(matricula, '0') = LTRIM(?, '0')
              AND escola_id = ?
        `).bind(matricula, escolaId).run();

        if (res.meta.changes === 0) {
            console.warn(`[Agente] Falha: Aluno ${matricula} não encontrado para atualizar biometria na escola ${escolaId}`);
            return new Response(JSON.stringify({ ok: false, erro: `Aluno '${matricula}' não encontrado nesta unidade.` }), { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.info(`[Agente] Biometria confirmada para aluno ${matricula} na escola ${escolaId}`);
        
        return new Response(JSON.stringify({ ok: true }), { 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (e: any) {
        console.error('[Agente] Falha ao confirmar biometria:', e.message);
        return new Response(JSON.stringify({ ok: false, erro: e.message }), { 
            status: e.status || 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
