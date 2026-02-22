async function processarBuscaTurmas(contexto) {
    try {
        const { results } = await contexto.env.DB_SCAE.prepare(
            "SELECT * FROM turmas ORDER BY id"
        ).all();
        // Mapeando para 'resultados' para manter padrão PT-BR no retorno se necessário, 
        // mas o D1 retorna 'results'. Vamos manter 'results' na extração e retornar direto ou mapear.
        // O código original retornava results direto.
        return Response.json(results);
    } catch (erro) {
        return new Response(erro.message, { status: 500 });
    }
}

async function processarCriacaoTurma(contexto) {
    try {
        const { id, serie, letra, turno, ano_letivo, criado_em, sala } = await contexto.request.json();

        if (!id) {
            return new Response("ID da turma obrigatório", { status: 400 });
        }

        // UPSERT
        await contexto.env.DB_SCAE.prepare(
            `INSERT INTO turmas (id, serie, letra, turno, ano_letivo, criado_em, sala) VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
             serie = excluded.serie,
             letra = excluded.letra,
             turno = excluded.turno,
             ano_letivo = excluded.ano_letivo,
             sala = excluded.sala`
        ).bind(id, serie, letra, turno, ano_letivo, criado_em || new Date().toISOString(), sala || null).run();

        return new Response("Turma criada", { status: 201 });
    } catch (erro) {
        return new Response(erro.message, { status: 500 });
    }
}

async function processarRemocaoTurma(contexto) {
    try {
        const url = new URL(contexto.request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return new Response("ID da turma obrigatório", { status: 400 });
        }

        await contexto.env.DB_SCAE.prepare(
            "DELETE FROM turmas WHERE id = ?"
        ).bind(id).run();

        return new Response("Turma removida", { status: 200 });
    } catch (erro) {
        return new Response(erro.message, { status: 500 });
    }
}

// Exportações com Alias para o Framework (Cloudflare Pages Functions exige esses nomes)
export {
    processarBuscaTurmas as onRequestGet,
    processarCriacaoTurma as onRequestPost,
    processarRemocaoTurma as onRequestDelete
};
