-- Migration: 004_add_alertas_evasao.sql
-- Adiciona tabela para alertas de evasão escolar (Art 70 ECA)

DROP TABLE IF EXISTS alertas_evasao;
CREATE TABLE alertas_evasao (
    id TEXT PRIMARY KEY,              -- UUID do alerta
    escola_id TEXT NOT NULL,
    aluno_matricula TEXT NOT NULL,
    motivo TEXT NOT NULL,             -- Motivo do alerta (ex: "Ausência por 3 dias letivos")
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE', 'EM_ANALISE', 'RESOLVIDO')),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_resolucao DATETIME,          -- Quando foi resolvido

    FOREIGN KEY (escola_id) REFERENCES escolas(id),
    FOREIGN KEY (aluno_matricula, escola_id) REFERENCES alunos(matricula, escola_id)
);
CREATE INDEX idx_alertas_evasao_escola ON alertas_evasao(escola_id);
CREATE INDEX idx_alertas_evasao_aluno ON alertas_evasao(aluno_matricula, escola_id);
CREATE INDEX idx_alertas_evasao_status ON alertas_evasao(status);
