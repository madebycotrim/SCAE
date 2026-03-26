/**
 * api/agente/sync-ponto.ts
 * Recebe lotes de batidas de ponto coletadas em hardware local.
 */
import { ContextoSCAE } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

export async function onRequestPost({ request, env }: ContextoSCAE) {
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
    // Usamos INSERT OR IGNORE para idempotência (evita erro se reenviar lote)
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO registros_acesso (
            id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura, 
            timestamp_acesso, leitor_id, id_evento_hardware, sincronizado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    try {
        // Criar batch de execuções para o D1
        const execucoes = registros.map(r => {
            // Normalizar dados para o esquema global
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

        const resultados = await db.batch(execucoes);
        
        // Contar quantos foram realmente inseridos (não ignorados)
        const totalInseridos = resultados.reduce((acc: number, r: any) => acc + (r.meta.changes || 0), 0);

        console.log(`[Agente] Sync-PONTO: Escola ${escolaId} enviou ${registros.length} registros. Novos: ${totalInseridos}`);

        return Response.json({
            ok: true,
            processados: registros.length,
            novos: totalInseridos
        });

    } catch (e: any) {
        console.error('[Agente] Erro crítico no Sync-PONTO:', e.message);
        return Response.json({
            erro: 'Falha interna ao processar lote',
            detalhe: e.message
        }, { status: 500 });
    }
}
