import type { ContextoSCAE } from '../../tipos/ambiente';

/**
 * Endpoint de migração incremental para garantir que a tabela escolas
 * tenha todas as colunas necessárias.
 * Acesse GET /api/central/migrar para executar.
 */
export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const resultados: string[] = [];

    // Migração 1: Coluna status
    try {
        await contexto.env.DB_SCAE.prepare(`
            ALTER TABLE escolas ADD COLUMN status TEXT DEFAULT 'ATIVA'
        `).run();
        resultados.push('Coluna [status] criada com sucesso.');
    } catch (e: any) {
        resultados.push(`Coluna [status]: ${e.message.includes('duplicate') || e.message.includes('already') ? 'já existe' : e.message}`);
    }

    // Migração 2: Coluna contato_suporte
    try {
        await contexto.env.DB_SCAE.prepare(`
            ALTER TABLE escolas ADD COLUMN contato_suporte TEXT
        `).run();
        resultados.push('Coluna [contato_suporte] criada com sucesso.');
    } catch (e: any) {
        resultados.push(`Coluna [contato_suporte]: ${e.message.includes('duplicate') || e.message.includes('already') ? 'já existe' : e.message}`);
    }

    return new Response(JSON.stringify({ 
        mensagem: 'Migração concluída.',
        detalhes: resultados
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

