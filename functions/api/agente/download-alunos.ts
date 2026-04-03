/**
 * api/agente/download-alunos.ts
 * Fornece a base de alunos da escola para o Agente Local fazer cache offline.
 */
import { ContextoCatraki } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

export async function onRequestGet({ request, env }: ContextoCatraki) {
    // 1. Validar segurança (Token + Escola ID)
    const escolaId = validarAgente(request, env);
    
    // 2. Extrair dados da escola no D1
    const { DB_SCAE: db } = env;

    try {
        // Selecionar alunos ativos E seus descritores faciais (se houver) via JOIN
        const alunos = await db.prepare(`
            SELECT a.matricula, a.nome_completo, a.turma_id, a.ativo
            FROM alunos a
            WHERE a.escola_id = ? AND a.ativo = 1
        `).bind(escolaId).all();

        console.log(`[Agente] Download-ALUNOS: Escola ${escolaId} baixou ${alunos.results.length} matriculas.`);

        return Response.json({
            ok: true,
            alunos: alunos.results,
            total: alunos.results.length,
            timestamp_servidor: new Date().toISOString()
        });

    } catch (e: any) {
        if (e.message && e.message.includes('no such table')) {
             console.log('[D1] Tabelas base ausentes no download. Criando...');
             await db.exec(`
                 CREATE TABLE IF NOT EXISTS escolas (id TEXT PRIMARY KEY, nome_escola TEXT, agente_pin TEXT, agente_api_key TEXT);
                 CREATE TABLE IF NOT EXISTS terminais (id TEXT PRIMARY KEY, escola_id TEXT NOT NULL, config_leitores TEXT, status TEXT DEFAULT 'OFFLINE', ultima_comunicacao DATETIME);
                 CREATE TABLE IF NOT EXISTS alunos (matricula TEXT PRIMARY KEY, nome_completo TEXT, turma_id TEXT, ativo INTEGER, escola_id TEXT);
                 CREATE TABLE IF NOT EXISTS registros_acesso (id TEXT PRIMARY KEY, escola_id TEXT, aluno_matricula TEXT, tipo_movimentacao TEXT, metodo_leitura TEXT, timestamp_acesso DATETIME, leitor_id TEXT, id_evento_hardware TEXT, sincronizado INTEGER DEFAULT 1, processado_presenca INTEGER DEFAULT 0, criado_em DATETIME);
                 INSERT OR IGNORE INTO escolas (id, nome_escola, agente_pin, agente_api_key) VALUES ('cem03-taguatinga', 'CEM 03 - Taguatinga', '123456', 'catraki_dev_token');
             `);
             
             try {
                const alunos = await db.prepare(`SELECT a.matricula, a.nome_completo, a.turma_id, a.ativo FROM alunos a WHERE a.escola_id = ? AND a.ativo = 1`).bind(escolaId).all();
                return Response.json({ ok: true, alunos: alunos.results, total: alunos.results.length, timestamp_servidor: new Date().toISOString() });
             } catch(e2: any) {}
        }
        console.error('[Agente] Erro crítico no Download-ALUNOS:', e.message);
        return Response.json({
            erro: 'Falha ao buscar alunos nas tabelas do sistema.',
            detalhe: e.message
        }, { status: 500 });
    }
}
