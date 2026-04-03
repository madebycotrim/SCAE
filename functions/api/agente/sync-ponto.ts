/**
 * api/agente/sync-ponto.ts
 * Recebe lotes de batidas de ponto coletadas em hardware local.
 */
import { ContextoCatraki } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

export async function onRequestPost({ request, env }: ContextoCatraki) {
    // 1. Validar segurança (Token + Escola ID)
    const escolaId = validarAgente(request, env);
    
    // 2. Extrair dados do lote
    const corpo = await request.json() as { registros: any[] };
    const { registros } = corpo;

    if (!Array.isArray(registros) || registros.length === 0) {
        return Response.json({ ok: true, processados: 0 });
    }

    const { DB_SCAE: db } = env;

    // 3. Persistir lotes no D1
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO registros_acesso (
            id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura, 
            timestamp_acesso, leitor_id, id_evento_hardware, sincronizado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    // Criar batch de execuções para o D1
    const execucoes = registros.map(r => {
        return stmt.bind(
            r.id, 
            escolaId, 
            r.aluno_matricula, 
            r.tipo_movimentacao, 
            r.metodo_leitura, 
            r.timestamp_acesso,
            r.leitor_id,
            r.id_evento_hardware
        );
    });

    try {
        const resultados = await db.batch(execucoes);
        const totalInseridos = resultados.reduce((acc: number, r: any) => acc + (r.meta.changes || 0), 0);

        return Response.json({
            ok: true,
            processados: registros.length,
            novos: totalInseridos
        });

    } catch (e: any) {
        console.error('[Agente] Erro Sync-PONTO:', e.message);
        return Response.json({ erro: 'Falha interna ao processar lote', detalhe: e.message }, { status: 500 });
    }
}
