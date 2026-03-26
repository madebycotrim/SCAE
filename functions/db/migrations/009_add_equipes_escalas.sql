-- Migração 009: Implementa controle de Equipes e Escalas (Attendance Scheduling)
-- Suporta o módulo de equipes com escalas fixas ou alternadas.

CREATE TABLE equipes (
    id TEXT NOT NULL,                   -- Slug (ex: ensino-medio)
    escola_id TEXT NOT NULL,
    nome_equipe TEXT NOT NULL,
    cor TEXT DEFAULT '#4F46E5',         -- Cor para UI
    tts_alias TEXT,                     -- Como o TTS pronuncia o nome (opcional)
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME,
    
    PRIMARY KEY (id, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE
);

CREATE TABLE grupos_equipe (
    id TEXT NOT NULL,                   -- UUID
    escola_id TEXT NOT NULL,
    equipe_id TEXT NOT NULL,
    nome_grupo TEXT NOT NULL,
    
    -- Configuração de Escala
    escala_tipo TEXT NOT NULL CHECK(escala_tipo IN ('FIXA', 'ALTERNADA')),
    escala_dias TEXT NOT NULL,          -- JSON: [1,2,3,4,5] (dias da semana) ou datas específicas
    
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME,

    PRIMARY KEY (id, escola_id),
    FOREIGN KEY (equipe_id, escola_id) REFERENCES equipes(id, escola_id) ON DELETE CASCADE
);

CREATE TABLE aluno_equipe (
    aluno_matricula TEXT NOT NULL,
    escola_id TEXT NOT NULL,
    equipe_id TEXT NOT NULL,
    grupo_id TEXT NOT NULL,
    
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (aluno_matricula, escola_id),
    FOREIGN KEY (aluno_matricula, escola_id) REFERENCES alunos(matricula, escola_id) ON DELETE CASCADE,
    FOREIGN KEY (equipe_id, escola_id) REFERENCES equipes(id, escola_id) ON DELETE CASCADE,
    FOREIGN KEY (grupo_id, escola_id) REFERENCES grupos_equipe(id, escola_id) ON DELETE CASCADE
);

CREATE INDEX idx_equipes_escola ON equipes(escola_id);
CREATE INDEX idx_grupos_equipe ON grupos_equipe(equipe_id, escola_id);
CREATE INDEX idx_aluno_equipe_grupo ON aluno_equipe(grupo_id, escola_id);
