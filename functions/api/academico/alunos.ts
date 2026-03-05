import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase, ErroValidacao, ErroNaoEncontrado } from '../erros';
import { verificarPermissao, extrairEscolaId } from '../seguranca';
import { esquemaAluno } from './alunos.esquemas';

async function processarBuscaAlunos(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA']);

    const { results } = await contexto.env.DB_SCAE.prepare(
        "SELECT matricula, escola_id, nome_completo, turma_id, ativo, base_legal, finalidade_coleta, prazo_retencao_meses, data_anonimizacao, anonimizado, criado_em, atualizado_em, data_exclusao FROM alunos WHERE escola_id = ?"
    ).bind(idEscola).all();

    return Response.json({
        dados: results,
        mensagem: 'Lista de alunos carregada com sucesso'
    });
}

async function processarCriacaoAluno(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO', 'SECRETARIA']);

    const corpo = await contexto.request.json();
    const resultadoZod = esquemaAluno.safeParse(corpo);

    if (!resultadoZod.success) {
        throw new ErroValidacao('Dados do aluno inválidos', 'ALUNO_VALIDACAO_001', { detalhes: resultadoZod.error.format() });
    }

    const { matricula, nome_completo, turma_id, ativo, email_responsavel } = resultadoZod.data;

    // UPSERT: Inserir ou Atualizar Aluno
    await contexto.env.DB_SCAE.prepare(
        `INSERT INTO alunos (matricula, escola_id, nome_completo, turma_id, ativo, base_legal, finalidade_coleta, prazo_retencao_meses) VALUES (?, ?, ?, ?, ?, 'obrigacao_legal', 'registro_acesso', 24)
            ON CONFLICT(matricula, escola_id) DO UPDATE SET
            nome_completo = excluded.nome_completo,
            turma_id = excluded.turma_id,
            ativo = excluded.ativo,
            atualizado_em = CURRENT_TIMESTAMP`
    ).bind(matricula, idEscola, nome_completo, turma_id ?? null, ativo ? 1 : 0).run();

    // Processamento de responsável... (Mantendo lógica de negócio original)
    if (email_responsavel && email_responsavel.trim() !== '') {
        const emailLimpo = email_responsavel.trim().toLowerCase();
        const responsavelExistente = await contexto.env.DB_SCAE.prepare(
            "SELECT id FROM responsaveis WHERE email = ? AND escola_id = ?"
        ).bind(emailLimpo, idEscola).first<{ id: string }>();

        let responsavelId = responsavelExistente?.id;

        if (!responsavelId) {
            responsavelId = crypto.randomUUID();
            await contexto.env.DB_SCAE.prepare(
                `INSERT INTO responsaveis (id, escola_id, email, nome_completo, base_legal, finalidade_coleta, prazo_retencao_meses) 
                    VALUES (?, ?, ?, ?, 'consentimento', 'portal_familia', 24)`
            ).bind(responsavelId, idEscola, emailLimpo, 'Responsável de ' + nome_completo).run();
        }

        await contexto.env.DB_SCAE.prepare(
            `INSERT INTO vinculos_responsavel_aluno (responsavel_id, aluno_matricula, escola_id)
                SELECT ?, ?, ?
                WHERE NOT EXISTS (
                    SELECT 1 FROM vinculos_responsavel_aluno 
                    WHERE responsavel_id = ? AND aluno_matricula = ? AND escola_id = ?
                )`
        ).bind(responsavelId, matricula, idEscola, responsavelId, matricula, idEscola).run();
    }

    return Response.json({
        dados: { matricula },
        mensagem: 'Aluno processado com sucesso'
    }, { status: 201 });
}

async function processarRemocaoAluno(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN']);

    const url = new URL(contexto.request.url);
    const matricula = url.searchParams.get("matricula");

    if (!matricula) {
        throw new ErroValidacao('Matrícula obrigatória para remoção', 'ALUNO_ID_AUSENTE');
    }

    const resultado = await contexto.env.DB_SCAE.prepare(
        "DELETE FROM alunos WHERE matricula = ? AND escola_id = ?"
    ).bind(matricula, idEscola).run();

    if (resultado.meta.changes === 0) {
        throw new ErroNaoEncontrado('Aluno não encontrado para exclusão');
    }

    return Response.json({
        mensagem: 'Aluno removido com sucesso'
    });
}

// Exportações com Alias para o Framework
export {
    processarBuscaAlunos as onRequestGet,
    processarCriacaoAluno as onRequestPost,
    processarRemocaoAluno as onRequestDelete
};
