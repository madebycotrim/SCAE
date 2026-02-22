async function processarBuscaAlunos(contexto) {
    // Sincronização: Retornar todos os alunos ativos para cache local
    try {
        const { results } = await contexto.env.DB_SCAE.prepare(
            "SELECT * FROM alunos"
        ).all();
        // 'results' é propriedade do D1 (inglês), mantemos a extração mas retornamos como dados
        return Response.json(results);
    } catch (erro) {
        return new Response(erro.message, { status: 500 });
    }
}

async function processarCriacaoAluno(contexto) {
    // Apenas Admin: Registrar novo aluno
    try {
        const { matricula, nome_completo, turma_id, status } = await contexto.request.json();

        if (!matricula || !nome_completo) {
            return new Response("Campos obrigatórios ausentes", { status: 400 });
        }

        // UPSERT: Inserir ou Atualizar
        await contexto.env.DB_SCAE.prepare(
            `INSERT INTO alunos (matricula, nome_completo, turma_id, status) VALUES (?, ?, ?, ?)
             ON CONFLICT(matricula) DO UPDATE SET
             nome_completo = excluded.nome_completo,
             turma_id = excluded.turma_id,
             status = excluded.status`
        ).bind(matricula, nome_completo, turma_id, status || 'ATIVO').run();

        return new Response("Criado", { status: 201 });
    } catch (erro) {
        return new Response(erro.message, { status: 500 });
    }
}

async function processarRemocaoAluno(contexto) {
    try {
        const url = new URL(contexto.request.url);
        const matricula = url.searchParams.get("matricula");

        if (!matricula) {
            return new Response("Matrícula obrigatória", { status: 400 });
        }

        await contexto.env.DB_SCAE.prepare(
            "DELETE FROM alunos WHERE matricula = ?"
        ).bind(matricula).run();

        return new Response("Aluno removido", { status: 200 });
    } catch (erro) {
        return new Response(erro.message, { status: 500 });
    }
}

// Exportações com Alias para o Framework
export {
    processarBuscaAlunos as onRequestGet,
    processarCriacaoAluno as onRequestPost,
    processarRemocaoAluno as onRequestDelete
};
