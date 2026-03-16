import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase, ErroInterno } from '../erros';
import { verificarPermissao } from '../seguranca';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);

        // 1. Total de acessos hoje (Global)
        const hoje = new Date().toISOString().split('T')[0];
        const { totalAcessosHoje } = await contexto.env.DB_SCAE.prepare(`
            SELECT COUNT(*) as totalAcessosHoje 
            FROM registros_acesso 
            WHERE DATE(timestamp_acesso) = DATE(?)
        `).bind(hoje).first() as { totalAcessosHoje: number };

        // 2. Alertas de Risco Pendentes (Global)
        const { alertasPendentes } = await contexto.env.DB_SCAE.prepare(`
            SELECT COUNT(*) as alertasPendentes 
            FROM alertas_risco 
            WHERE status = 'PENDENTE'
        `).first() as { alertasPendentes: number };

        // 3. Status de Conexão DB (Implicitamente testado pelas queries acima)
        
        // 4. Cor do Dia (Baseada na Data)
        const seed = hoje.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const cores = ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#000000', '#111827'];
        const corDoDia = cores[seed % cores.length];

        return new Response(JSON.stringify({ 
            dados: {
                totalAcessosHoje: totalAcessosHoje || 0,
                alertasPendentes: alertasPendentes || 0,
                statusDB: 'OPERACIONAL',
                corDoDia
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (erro) {
        console.error('Erro ao buscar saude do sistema:', erro);
        if (erro instanceof ErroBase) {
            return new Response(JSON.stringify(erro.toJSON()), { 
                status: erro.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const erroInterno = new ErroInterno('Falha ao monitorar infraestrutura');
        return new Response(JSON.stringify(erroInterno.toJSON()), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
