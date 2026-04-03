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
    // Usamos INSERT OR IGNORE para idempotência (evita erro se reenviar lote)
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO registros_acesso (
            id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura, 
            timestamp_acesso, leitor_id, id_evento_hardware, sincronizado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

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

    try {
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
        // Se a tabela não existir, criar e tentar novamente (Self-healing)
        if (e.message && (e.message.includes('no such table') || e.message.includes('not found'))) {
             console.log('[D1] Tabelas base ausentes no sync. Criando...');
             await db.exec(`
                 CREATE TABLE IF NOT EXISTS escolas (id TEXT PRIMARY KEY, nome_escola TEXT, agente_pin TEXT, agente_api_key TEXT);
                 CREATE TABLE IF NOT EXISTS terminais (id TEXT PRIMARY KEY, escola_id TEXT NOT NULL, config_leitores TEXT, status TEXT DEFAULT 'OFFLINE', ultima_comunicacao DATETIME);
                 CREATE TABLE IF NOT EXISTS alunos (matricula TEXT PRIMARY KEY, nome_completo TEXT, turma_id TEXT, ativo INTEGER, escola_id TEXT);
                 CREATE TABLE IF NOT EXISTS descritores_faciais (id TEXT PRIMARY KEY, aluno_matricula TEXT, escola_id TEXT, vetor_facial TEXT);
                 CREATE TABLE IF NOT EXISTS registros_acesso (id TEXT PRIMARY KEY, escola_id TEXT, aluno_matricula TEXT, tipo_movimentacao TEXT, metodo_leitura TEXT, timestamp_acesso DATETIME, leitor_id TEXT, id_evento_hardware TEXT, sincronizado INTEGER DEFAULT 1, processado_presenca INTEGER DEFAULT 0, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP);
                 INSERT OR IGNORE INTO escolas (id, nome_escola, agente_pin, agente_api_key) VALUES ('cem03-taguatinga', 'CEM 03 - Taguatinga', '123456', 'catraki_dev_token');
             `);
             
             try {
                const resultados = await db.batch(execucoes);
                const totalInseridos = resultados.reduce((acc: number, r: any) => acc + (r.meta.changes || 0), 0);
                return Response.json({ ok: true, processados: registros.length, novos: totalInseridos });
             } catch(e2: any) {
                console.error('[D1] Falha após reparo:', e2.message);
                return Response.json({ erro: 'Falha pós-reparo', detalhe: e2.message }, { status: 500 });
             }
        }

        console.error('[Agente] Erro crítico no Sync-PONTO:', e.message, JSON.stringify(registros[0]));
        return Response.json({
            erro: 'Falha interna ao processar lote',
            detalhe: e.message,
            exemplo: registros[0]
        }, { status: 500 });
    }
}
