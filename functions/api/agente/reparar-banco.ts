/**
 * api/agente/reparar-banco.ts
 * Utilitário de emergência para criar tabelas faltantes no D1 Local.
 */
import { ContextoCatraki } from '../../tipos/ambiente';

export async function onRequestGet(contexto: ContextoCatraki) {
    const { DB_SCAE: db } = contexto.env;

    try {
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS terminais (
                escola_id TEXT PRIMARY KEY,
                config_leitores TEXT DEFAULT '[]',
                atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        return Response.json({
            ok: true,
            mensagem: "Tabela 'terminais' criada ou já existente com sucesso!",
            timestamp: new Date().toISOString()
        });
    } catch (e: any) {
        return Response.json({
            ok: false,
            erro: e.message
        }, { status: 500 });
    }
}
