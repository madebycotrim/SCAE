import type { ContextoCatraki, PayloadRegistroAcesso, ResultadoSincronizacao } from '../../tipos/ambiente';
import { ErroValidacao, ErroInterno, ErroBase } from '../erros';
import { verificarAcesso, extrairEscolaId } from '../_seguranca';
import { Permissao } from '../seguranca/rbac';

async function processarSincronizacaoAcessos(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        // RBAC: PORTEIRO também pode sincronizar
        verificarAcesso(contexto, Permissao.REGISTRAR_ACESSO);

        let registros: PayloadRegistroAcesso[] = [];
        try {
            const corpo: any = await contexto.request.json();
            // Suporta [{...}] ou { registros: [{...}] }
            registros = Array.isArray(corpo) ? corpo : (corpo?.registros || []);
        } catch {
            throw new ErroValidacao('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR');
        }

        if (!registros.length) {
            return Response.json({ dados: [], mensagem: 'Nenhum registro no lote' });
        }

        // Usar db.batch() para inserir todos de uma vez (1 round-trip ao D1)
        const stmt = contexto.env.DB_SCAE.prepare(
            `INSERT OR IGNORE INTO registros_acesso
            (id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura, timestamp_acesso, sincronizado)
            VALUES (?, ?, ?, ?, ?, ?, 1)`
        );

        const stmts = registros.map(registro => {
             // 🛡️ Fallback robusto para nomes de campos (Híbrido Agente/Worker)
             const ts = (registro as any).timestamp || (registro as any).timestamp_acesso || (registro as any).data_acesso || new Date().toISOString();
             const metodo = (registro as any).metodo_validacao || (registro as any).metodo_leitura || 'manual';
             
             return stmt.bind(
                registro.id,
                idEscola,
                registro.aluno_matricula,
                registro.tipo_movimentacao,
                metodo,
                ts
            );
        });

        const batchResults = await contexto.env.DB_SCAE.batch(stmts);

        const resultados: ResultadoSincronizacao[] = registros.map((registro, i) => ({
            id: registro.id,
            status: batchResults[i]?.success ? 'sincronizado' as const : 'erro' as const,
            ...(batchResults[i]?.success ? {} : { erro: 'Falha na inserção em batch' })
        }));

        return Response.json({
            dados: resultados,
            mensagem: 'Sincronização processada'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao sincronizar acessos');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

async function processarBuscaAcessos(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.VER_ACESSO);

        const { searchParams } = new URL(contexto.request.url);
        const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1', 10) || 1);
        const porPagina = Math.min(200, Math.max(1, parseInt(searchParams.get('limite') || '50', 10) || 50));
        const offset = (pagina - 1) * porPagina;
        const data = searchParams.get('data');
        const desde = searchParams.get('desde');
        const matricula = searchParams.get('matricula');
        
        const hojeLocal = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date()).split('/').reverse().join('-');

        let queryBase = "FROM registros_acesso WHERE escola_id = ?";
        const params: (string | number)[] = [idEscola];

        if (data) {
            queryBase += " AND date(timestamp_acesso, '-3 hours') = ?";
            params.push(data);
        } else if (desde) {
            queryBase += " AND timestamp_acesso > ?";
            params.push(desde);
        } else {
            // Hoje local
            queryBase += " AND date(timestamp_acesso, '-3 hours') = ?";
            params.push(hojeLocal);
        }

        if (matricula) {
            queryBase += " AND aluno_matricula = ?";
            params.push(matricula);
        }

        // Buscar total + dados em batch (1 round-trip)
        const [countResult, dataResult] = await contexto.env.DB_SCAE.batch([
            contexto.env.DB_SCAE.prepare(`SELECT COUNT(*) as total ${queryBase}`).bind(...params),
            contexto.env.DB_SCAE.prepare(
                `SELECT id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura as metodo_validacao, timestamp_acesso as timestamp, sincronizado ${queryBase} ORDER BY timestamp_acesso DESC LIMIT ? OFFSET ?`
            ).bind(...params, porPagina, offset)
        ]);

        const total = (countResult.results[0] as { total: number })?.total || 0;

        return Response.json({
            dados: dataResult.results,
            meta: {
                total,
                pagina,
                porPagina,
                totalPaginas: Math.ceil(total / porPagina)
            },
            mensagem: 'Histórico de acessos carregado'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar acessos');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

async function processarExclusaoAcessos(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.GERENCIAR_ACESSO);

        // Deleta todos os registros de acesso desta escola
        await contexto.env.DB_SCAE.prepare(
            "DELETE FROM registros_acesso WHERE escola_id = ?"
        ).bind(idEscola).run();

        // 🧹 Enfileirar comando para o Agente Local também limpar seu banco físico
        const { KV_SCAE } = contexto.env;
        if (KV_SCAE) {
            const chaveQueue = `escola:${idEscola}:comandos`;
            const comandosAtuais = await KV_SCAE.get(chaveQueue, 'json') as any[] || [];
            comandosAtuais.push({
                id: crypto.randomUUID(),
                acao: 'WIPE_LOGS',
                params: {},
                timestamp: new Date().toISOString()
            });
            await KV_SCAE.put(chaveQueue, JSON.stringify(comandosAtuais), { expirationTtl: 600 });
        }

        return Response.json({
            ok: true,
            mensagem: 'Histórico de acessos removido com sucesso.'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao limpar acessos');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

// Exportações com Alias para o Framework
export {
    processarSincronizacaoAcessos as onRequestPost,
    processarBuscaAcessos as onRequestGet,
    processarExclusaoAcessos as onRequestDelete
};
