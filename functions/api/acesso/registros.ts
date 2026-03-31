import type { ContextoCatraki, PayloadRegistroAcesso, ResultadoSincronizacao } from '../../tipos/ambiente';
import { ErroValidacao, ErroInterno, ErroBase } from '../erros';
import { verificarAcesso, extrairEscolaId } from '../_seguranca';
import { Permissao } from '../seguranca/rbac';

async function processarSincronizacaoAcessos(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        // RBAC: PORTEIRO também pode sincronizar
        verificarAcesso(contexto, Permissao.REGISTRAR_ACESSO);

        let registros: PayloadRegistroAcesso[];
        try {
            registros = await contexto.request.json();
        } catch {
            throw new ErroValidacao('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR');
        }

        if (!Array.isArray(registros)) {
            throw new ErroValidacao('Esperado array de registros para sincronização');
        }

        // Usar db.batch() para inserir todos de uma vez (1 round-trip ao D1)
        const stmt = contexto.env.DB_CATRAKI.prepare(
            `INSERT OR IGNORE INTO registros_acesso
            (id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura, timestamp_acesso, sincronizado)
            VALUES (?, ?, ?, ?, ?, ?, 1)`
        );

        const stmts = registros.map(registro => stmt.bind(
            registro.id,
            idEscola,
            registro.aluno_matricula,
            registro.tipo_movimentacao,
            registro.metodo_validacao || 'manual',
            registro.timestamp
        ));

        const batchResults = await contexto.env.DB_CATRAKI.batch(stmts);

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

        let queryBase = "FROM registros_acesso WHERE escola_id = ?";
        const params: (string | number)[] = [idEscola];

        if (data) {
            queryBase += " AND substr(timestamp_acesso, 1, 10) = ?";
            params.push(data);
        } else if (desde) {
            queryBase += " AND timestamp_acesso > ?";
            params.push(desde);
        }

        if (matricula) {
            queryBase += " AND aluno_matricula = ?";
            params.push(matricula);
        }

        // Buscar total + dados em batch (1 round-trip)
        const [countResult, dataResult] = await contexto.env.DB_CATRAKI.batch([
            contexto.env.DB_CATRAKI.prepare(`SELECT COUNT(*) as total ${queryBase}`).bind(...params),
            contexto.env.DB_CATRAKI.prepare(
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

// Exportações com Alias para o Framework
export {
    processarSincronizacaoAcessos as onRequestPost,
    processarBuscaAcessos as onRequestGet
};
