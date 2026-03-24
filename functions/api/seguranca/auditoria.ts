/**
 * Worker de Logs de Auditoria.
 * POST: Receber batch de logs do frontend
 * GET: Buscar logs (Smart Sync — desde timestamp)
 */
import type { ContextoSCAE, LogAuditoriaDB, ResultadoSincronizacao } from '../../tipos/ambiente';
import { ErroBase, ErroInterno, ErroValidacao } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../_seguranca';

async function processarRecebimentoLogs(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        // RBAC: Qualquer papel pode enviar logs de auditoria (são gerados automaticamente)
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTEIRO']);

        let logs: LogAuditoriaDB[];
        try {
            logs = await contexto.request.json();
        } catch {
            throw new ErroValidacao('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR');
        }

        if (!Array.isArray(logs)) {
            throw new ErroValidacao('Esperado array de logs', 'AUDITORIA_VALIDACAO_001');
        }

        // Usar db.batch() para inserir todos de uma vez (1 round-trip ao D1)
        const stmt = contexto.env.DB_SCAE.prepare(
            `INSERT OR IGNORE INTO logs_auditoria 
            (id, escola_id, criado_em, usuario_email, acao, entidade_tipo, entidade_id, dados_anteriores, dados_novos, ip_address, user_agent, sincronizado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
        );

        const stmts = logs.map(log => stmt.bind(
            log.id,
            idEscola,
            log.criado_em || new Date().toISOString(),
            log.usuario_email ?? null,
            log.acao ?? null,
            log.entidade_tipo ?? null,
            log.entidade_id ?? null,
            log.dados_anteriores ?? null,
            log.dados_novos ?? null,
            log.ip_address ?? null,
            log.user_agent ?? null
        ));

        const batchResults = await contexto.env.DB_SCAE.batch(stmts);

        const resultados: ResultadoSincronizacao[] = logs.map((log, i) => ({
            id: log.id,
            status: batchResults[i]?.success ? 'sincronizado' as const : 'erro' as const,
            ...(batchResults[i]?.success ? {} : { erro: 'Falha na inserção em batch' })
        }));

        return Response.json({
            dados: resultados,
            mensagem: 'Logs de auditoria sincronizados'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao sincronizar logs');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

async function processarVerificacaoLogs(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

        const url = new URL(contexto.request.url);
        const desde = url.searchParams.get('desde');

        let query = `SELECT id, escola_id, criado_em, usuario_email, acao, entidade_tipo, entidade_id, dados_anteriores, dados_novos, ip_address, user_agent FROM logs_auditoria WHERE escola_id = ?`;
        const params: string[] = [idEscola];

        if (desde) {
            query += ` AND criado_em > ?`;
            params.push(desde);
        }

        query += ` ORDER BY criado_em DESC LIMIT 500`;

        const { results } = await contexto.env.DB_SCAE.prepare(query).bind(...params).all();
        
        return Response.json({
            dados: results,
            mensagem: 'Logs de auditoria carregados'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar logs');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

// Exportações com Alias
export { processarRecebimentoLogs as onRequestPost, processarVerificacaoLogs as onRequestGet };
