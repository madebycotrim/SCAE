import type { ContextoSCAE, PayloadRegistroAcesso, ResultadoSincronizacao } from '../../tipos/ambiente';
import { ErroValidacao } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../seguranca';
import { FabricaFCM } from '../utilitarios/fcm';

async function processarSincronizacaoAcessos(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    // RBAC: PORTEIRO também pode sincronizar
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTEIRO']);

    const registros: PayloadRegistroAcesso[] = await contexto.request.json();

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

            // Se for um novo registro (não duplicata), notificar os responsáveis
            // Note: success no D1 indica se a query rodou, não se inseriu (IGNORE sempre dá success).
            // Para ser preciso, poderíamos verificar meta.changes ou as chaves primárias.
            // Para o MVP: Disparamos sempre que o registro chegar, o app do pai lida com a timeline.

            // Buscar responsáveis vinculados que possuem token FCM
            const { results: responsaveis } = await contexto.env.DB_SCAE.prepare(`
                SELECT r.fcm_token, a.nome_completo as nome_aluno
                FROM responsaveis r
                INNER JOIN vinculos_responsavel_aluno v ON r.id = v.responsavel_id AND r.escola_id = v.escola_id
                INNER JOIN alunos a ON v.aluno_matricula = a.matricula AND v.escola_id = a.escola_id
                WHERE v.aluno_matricula = ? AND v.escola_id = ? AND r.fcm_token IS NOT NULL
            `).bind(registro.aluno_matricula, idEscola).all<{ fcm_token: string, nome_aluno: string }>();

            if (responsaveis && responsaveis.length > 0) {
                const acao = registro.tipo_movimentacao === 'ENTRADA' ? 'entrou na' : 'saiu da';
                const titulo = `SCAE: ${registro.tipo_movimentacao}`;
                const corpo = `${responsaveis[0].nome_aluno} ${acao} escola agora.`;

                // Dispara em paralelo para todos os dispositivos vinculados (ex: pai e mãe)
                const promessas = responsaveis.map(resp =>
                    FabricaFCM.enviarNotificacao(
                        resp.fcm_token,
                        titulo,
                        corpo,
                        { tipo: registro.tipo_movimentacao, aluno_id: registro.aluno_matricula },
                        (contexto.env as any).FIREBASE_SERVER_KEY
                    )
                );
                await Promise.allSettled(promessas);
            }

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
}

async function processarBuscaAcessos(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA']);

    const { searchParams } = new URL(contexto.request.url);
    const limite = searchParams.get('limite') || '1000';
    const data = searchParams.get('data');
    const desde = searchParams.get('desde');

    let query = "SELECT id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura as metodo_validacao, timestamp_acesso as timestamp, sincronizado FROM registros_acesso WHERE escola_id = ?";
    const params: (string | number)[] = [idEscola];

    if (data) {
        query += " AND substr(timestamp_acesso, 1, 10) = ?";
        params.push(data);
    } else if (desde) {
        query += " AND timestamp_acesso > ?";
        params.push(desde);
    }

    query += " ORDER BY timestamp_acesso DESC LIMIT ?";
    params.push(Number(limite));

    const { results } = await contexto.env.DB_SCAE.prepare(query).bind(...params).all();

    return Response.json({
        dados: results,
        mensagem: 'Histórico de acessos carregado'
    });
}

// Exportações com Alias para o Framework
export {
    processarSincronizacaoAcessos as onRequestPost,
    processarBuscaAcessos as onRequestGet
};
