/**
 * API Central para o Motor de Evasão Escolar.
 * Implementa a detecção de alunos ausentes consecutivamente (Art 70 ECA).
 *
 * GET /api/evasao → Retorna a lista de alertas agrupadas por turma
 * PATCH /api/evasao/:id → Atualiza o status de acompanhamento
 * POST /api/evasao/processar → Roda a engine varrendo o tenant por ausências
 */
import { gerarScaeUuid } from '../../../utilitarios/uuid';
import type { ContextoCatraki, PayloadAtualizacaoAlerta } from '../../../tipos/ambiente';
import { ErroBase, ErroInterno, ErroValidacao } from '../../erros';
import { verificarPermissao, extrairEscolaId } from '../../_seguranca';
import { obterDiasNaoLetivos } from '../calendario.compartilhado';

export async function onRequestGet(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

        const { results } = await contexto.env.DB_SCAE.prepare(`
            SELECT
                a.id,
                a.aluno_matricula,
                a.motivo,
                a.status,
                a.criado_em as data_criacao,
                a.data_resolucao,
                al.nome_completo AS aluno_nome,
                t.id AS turma_nome
            FROM alertas_evasao a
            INNER JOIN alunos al ON a.aluno_matricula = al.matricula AND a.escola_id = al.escola_id
            LEFT JOIN turmas t ON al.turma_id = t.id AND al.escola_id = t.escola_id
            WHERE a.escola_id = ?
            ORDER BY
                CASE a.status
                    WHEN 'PENDENTE' THEN 1
                    WHEN 'EM_ANALISE' THEN 2
                    WHEN 'RESOLVIDO' THEN 3
                END,
                a.criado_em DESC
        `).bind(idEscola).all();

        return Response.json({
            dados: results,
            mensagem: 'Alertas de evasão carregados'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar alertas de evasão');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

export async function onRequestPost(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

        const url = new URL(contexto.request.url);
        if (url.pathname.endsWith('/processar')) {
            return await processarMotorEvasao(contexto.env.DB_SCAE, idEscola);
        }

        throw new ErroValidacao('Rota POST não reconhecida', 'EVASAO_ROTA_INVALIDA');
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao processar evasão');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

export async function onRequestPatch(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);

        const url = new URL(contexto.request.url);
        const pathParts = url.pathname.split('/');
        const alertaId = pathParts[pathParts.length - 1];
        if (!alertaId || alertaId === 'evasao') {
            throw new ErroValidacao('ID do alerta ausente', 'EVASAO_ID_AUSENTE');
        }

        return await atualizarStatusAlerta(contexto, contexto.env.DB_SCAE, idEscola, alertaId);
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao atualizar alerta');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

/**
 * Atualiza o status da tratativa da coordenação com a familia do aluno em risco.
 */
async function atualizarStatusAlerta(contexto: ContextoCatraki, db: D1Database, idEscola: string, alertaId: string): Promise<Response> {
    let dados: PayloadAtualizacaoAlerta;
    try {
        dados = await contexto.request.json();
    } catch {
        throw new ErroValidacao('JSON inválido', 'JSON_PARSE_ERROR');
    }

    if (!dados.status || !['PENDENTE', 'EM_ANALISE', 'RESOLVIDO'].includes(dados.status)) {
        throw new ErroValidacao('Status inválido. Valores aceitos: PENDENTE, EM_ANALISE, RESOLVIDO', 'EVASAO_STATUS_INVALIDO');
    }

    const query = dados.status === 'RESOLVIDO'
        ? `UPDATE alertas_evasao SET status = ?, data_resolucao = CURRENT_TIMESTAMP WHERE id = ? AND escola_id = ?`
        : `UPDATE alertas_evasao SET status = ?, data_resolucao = NULL WHERE id = ? AND escola_id = ?`;

    const resultado = await db.prepare(query).bind(dados.status, alertaId, idEscola).run();

    if (resultado.meta.changes === 0) {
        throw new ErroValidacao('Alerta não encontrado', 'EVASAO_NAO_ENCONTRADO');
    }

    return Response.json({
        dados: { id: alertaId, status: dados.status },
        mensagem: 'Status do alerta atualizado'
    });
}

/**
 * Scaneia os alunos e verifica os registros para aplicar regras de evasão contínua.
 * OTIMIZADO: Usa query unificada em vez de N+1 queries por aluno.
 */
async function processarMotorEvasao(db: D1Database, idEscola: string): Promise<Response> {
    try {
        // 1. Definir o período de 3 dias LETIVOS
        const diasNaoLetivos = await obterDiasNaoLetivos(db, idEscola);
        
        const { results: diasCandidatos } = await db.prepare(`
            WITH RECURSIVE dias(d) AS (
                SELECT date('now')
                UNION ALL
                SELECT date(d, '-1 day') FROM dias WHERE d > date('now', '-30 days')
            )
            SELECT d FROM dias
            WHERE strftime('%w', d) NOT IN ('0', '6')
            ORDER BY d DESC
        `).all<{ d: string }>();

        const diasLetivos = (diasCandidatos || [])
            .filter(dia => !diasNaoLetivos.includes(dia.d))
            .slice(0, 3);

        if (diasLetivos.length < 3) {
            return Response.json({ 
                dados: { gerados: 0 },
                mensagem: 'Período letivo insuficiente para análise (mínimo 3 dias)' 
            });
        }

        const dataMaisAntiga = diasLetivos[diasLetivos.length - 1].d;

        // 2. Query UNIFICADA: encontrar alunos ativos SEM registro nos últimos 3 dias letivos
        //    E que NÃO tenham alerta ativo (PENDENTE ou EM_ANALISE)
        const { results: alunosSemAcesso } = await db.prepare(`
            SELECT a.matricula
            FROM alunos a
            WHERE a.escola_id = ? 
              AND a.ativo = 1
              AND NOT EXISTS (
                SELECT 1 FROM registros_acesso r
                WHERE r.aluno_matricula = a.matricula 
                  AND r.escola_id = a.escola_id
                  AND r.timestamp_acesso >= ?
              )
              AND NOT EXISTS (
                SELECT 1 FROM alertas_evasao e
                WHERE e.aluno_matricula = a.matricula 
                  AND e.escola_id = a.escola_id
                  AND e.status IN ('PENDENTE', 'EM_ANALISE')
              )
        `).bind(idEscola, `${dataMaisAntiga} 00:00:00`).all<{ matricula: string }>();

        const alunosParaAlertar = alunosSemAcesso || [];

        if (alunosParaAlertar.length === 0) {
            return Response.json({
                dados: { gerados: 0 },
                mensagem: 'Verificação completa. Nenhum novo alerta necessário.'
            });
        }

        // 3. Inserir alertas em batch (1 round-trip)
        const stmt = db.prepare(`
            INSERT INTO alertas_evasao(id, escola_id, aluno_matricula, motivo, status)
            VALUES (?, ?, ?, 'Sem registro de acesso nos últimos 3 dias letivos', 'PENDENTE')
        `);

        const stmts = alunosParaAlertar.map(aluno => 
            stmt.bind(gerarScaeUuid(), idEscola, aluno.matricula)
        );

        await db.batch(stmts);

        return Response.json({
            dados: { gerados: alunosParaAlertar.length },
            mensagem: `Verificação completa. ${alunosParaAlertar.length} novos alertas emitidos.`
        });

    } catch (error) {
        const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
        const erroInterno = new ErroInterno(`Falha no motor de evasão: ${mensagem}`);
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
