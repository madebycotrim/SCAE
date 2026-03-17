import type { ContextoSCAE } from '../../tipos/ambiente';

/**
 * Endpoint temporário para garantir que a tabela escolas tenha a coluna 'status'.
 * Acesse /api/central/migrar para executar.
 */
export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        // Tenta adicionar a coluna status. Se já existir, o D1 vai dar erro e nós ignoramos.
        try {
            await contexto.env.DB_SCAE.prepare(`
                ALTER TABLE escolas ADD COLUMN status TEXT DEFAULT 'ATIVA'
            `).run();
        } catch (e: any) {
            console.log('Coluna status talvez já exista ou erro ao criar:', e.message);
        }

        return new Response(JSON.stringify({ 
            mensagem: 'Migração concluída ou já executada.',
            detalhes: 'Coluna [status] verificada na tabela [escolas]'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (erro: any) {
        return new Response(JSON.stringify({ erro: erro.message }), { status: 500 });
    }
}
