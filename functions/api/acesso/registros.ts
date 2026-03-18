import type { ContextoSCAE, PayloadRegistroAcesso, ResultadoSincronizacao } from '../../tipos/ambiente';
import { ErroValidacao, ErroInterno, ErroBase } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../_seguranca';
import { FabricaFCM } from '../utilitarios/fcm';

async function processarSincronizacaoAcessos(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        // RBAC: PORTEIRO também pode sincronizar
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTEIRO']);

        let registros: PayloadRegistroAcesso[];
        try {
            registros = await contexto.request.json();
        } catch (parseError) {
            throw new ErroValidacao('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR');
        }

        if (!Array.isArray(registros)) {
            throw new ErroValidacao('Esperado array de registros para sincronização');
        }

        const resultados: ResultadoSincronizacao[] = [];

        for (const registro of registros) {
            try {
                // IDEMPOTÊNCIA: Usar INSERT OR IGNORE.
                const { success } = await contexto.env.DB_SCAE.prepare(
                    `INSERT OR IGNORE INTO registros_acesso
                    (id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura, timestamp_acesso, sincronizado)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    registro.id,
                    idEscola,
                    registro.aluno_matricula,
                    registro.tipo_movimentacao,
                    registro.metodo_validacao || 'manual',
                    registro.timestamp,
                    1
                ).run();

                resultados.push({ id: registro.id, status: 'sincronizado' });

            } catch (erro) {
                console.error(`Erro ao sincronizar registro ${registro.id}:`, erro);
                resultados.push({ id: registro.id, status: 'erro', erro: erro instanceof Error ? erro.message : 'Erro desconhecido' });
            }
        }

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

async function processarBuscaAcessos(contexto: ContextoSCAE): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA']);

        const { searchParams } = new URL(contexto.request.url);
        const limite = searchParams.get('limite') || '1000';
        const data = searchParams.get('data');
        const desde = searchParams.get('desde');
        const matricula = searchParams.get('matricula');

        let query = "SELECT id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura as metodo_validacao, timestamp_acesso as timestamp, sincronizado FROM registros_acesso WHERE escola_id = ?";
        const params: (string | number)[] = [idEscola];

        if (data) {
            query += " AND substr(timestamp_acesso, 1, 10) = ?";
            params.push(data);
        } else if (desde) {
            query += " AND timestamp_acesso > ?";
            params.push(desde);
        }

        if (matricula) {
            query += " AND aluno_matricula = ?";
            params.push(matricula);
        }

        query += " ORDER BY timestamp_acesso DESC LIMIT ?";
        params.push(Number(limite));

        try {
            const { results } = await contexto.env.DB_SCAE.prepare(query).bind(...params).all();

            return Response.json({
                dados: results,
                mensagem: 'Histórico de acessos carregado'
            });
        } catch (dbError) {
            throw new ErroInterno(`Falha ao consultar acessos: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = erro instanceof ErroInterno ? erro : new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar acessos');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

// Exportações com Alias para o Framework
export {
    processarSincronizacaoAcessos as onRequestPost,
    processarBuscaAcessos as onRequestGet
};
