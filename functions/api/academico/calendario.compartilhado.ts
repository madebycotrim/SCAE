// functions/api/academico/calendario.compartilhado.ts

export const CALENDARIO_SEEDF_2026 = [
    { data: '2026-01-01', descricao: 'Confraternização Universal', tipo: 'FERIADO' },
    { data: '2026-02-16', descricao: 'Recesso de Carnaval', tipo: 'RECESSO' },
    { data: '2026-02-17', descricao: 'Carnaval', tipo: 'RECESSO' },
    { data: '2026-02-18', descricao: 'Quarta-feira de Cinzas', tipo: 'RECESSO' },
    { data: '2026-04-03', descricao: 'Paixão de Cristo', tipo: 'FERIADO' },
    { data: '2026-04-21', descricao: 'Tiradentes / Aniv. Brasília', tipo: 'FERIADO' },
    { data: '2026-05-01', descricao: 'Dia do Trabalho', tipo: 'FERIADO' },
    { data: '2026-06-04', descricao: 'Corpus Christi', tipo: 'RECESSO' },
    { data: '2026-07-11', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-12', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-13', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-14', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-15', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-16', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-17', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-18', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-19', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-20', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-21', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-22', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-23', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-24', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-25', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-07-26', descricao: 'Recesso de Meio de Ano', tipo: 'RECESSO' },
    { data: '2026-09-07', descricao: 'Independência do Brasil', tipo: 'FERIADO' },
    { data: '2026-10-12', descricao: 'Nsa Sra Aparecida', tipo: 'FERIADO' },
    { data: '2026-10-15', descricao: 'Dia do Professor', tipo: 'FERIADO' },
    { data: '2026-11-02', descricao: 'Finados', tipo: 'FERIADO' },
    { data: '2026-11-15', descricao: 'Proclamação da República', tipo: 'FERIADO' },
    { data: '2026-11-20', descricao: 'Dia da Consciência Negra', tipo: 'FERIADO' },
    { data: '2026-11-30', descricao: 'Dia do Evangélico', tipo: 'FERIADO' },
    { data: '2026-12-25', descricao: 'Natal', tipo: 'FERIADO' },
    { data: '2026-12-23', descricao: 'Recesso Escolar', tipo: 'RECESSO' },
    { data: '2026-12-24', descricao: 'Recesso Escolar', tipo: 'RECESSO' },
    { data: '2026-12-26', descricao: 'Recesso Escolar', tipo: 'RECESSO' },
    { data: '2026-12-27', descricao: 'Recesso Escolar', tipo: 'RECESSO' },
    { data: '2026-12-28', descricao: 'Recesso Escolar', tipo: 'RECESSO' },
    { data: '2026-12-29', descricao: 'Recesso Escolar', tipo: 'RECESSO' },
    { data: '2026-12-30', descricao: 'Recesso Escolar', tipo: 'RECESSO' },
    { data: '2026-12-31', descricao: 'Recesso Escolar', tipo: 'RECESSO' },
];

export async function obterDiasNaoLetivos(db: D1Database, idEscola: string): Promise<string[]> {
    // 1. Dias Manuais
    const { results } = await db.prepare(
        `SELECT data FROM calendario_letivo WHERE escola_id = ?`
    ).bind(idEscola).all() as { results: { data: string }[] };

    if (results && results.length > 0) {
        return results.map(r => r.data);
    }

    // 2. Inteligente: SEEDF
    const escola = await db.prepare(
        `SELECT dominio_email FROM escolas WHERE id = ?`
    ).bind(idEscola).first() as { dominio_email?: string };

    if (escola?.dominio_email?.includes('se.df.gov.br')) {
        return CALENDARIO_SEEDF_2026.map(d => d.data);
    }

    return [];
}
