-- schema.sql
-- SCAE: Multi-Tenant + LGPD compliance
-- Alinhado com bancoLocal.tipos.ts e sincronizacao.ts (v2026-03)

-- ====================================
-- ESCOLAS (Antigos Tenants)
-- ====================================
DROP TABLE IF EXISTS escolas;
CREATE TABLE escolas (
    id TEXT PRIMARY KEY,               -- Slug da escola (ex: cem03-taguatinga)
    nome_escola TEXT NOT NULL,
    dominio_email TEXT,                -- Para validação de login admin (ex: @edu.se.df.gov.br)
    cor_primaria TEXT DEFAULT '#000000',
    cor_secundaria TEXT DEFAULT '#ffffff',
    tts_ativado BOOLEAN DEFAULT 1,
    janelas TEXT DEFAULT '[]',         -- Configuração de horários JSON
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);



-- ====================================
-- USUÁRIOS (Admin/Controle de Acesso/Coordenação)
-- Alinhado com: UsuarioLocal + PapelUsuario
-- ====================================
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
    email TEXT NOT NULL,
    escola_id TEXT NOT NULL,
    nome_completo TEXT,                -- opcional no tipo local
    papel TEXT NOT NULL CHECK(papel IN ('CENTRAL', 'ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTEIRO', 'VISUALIZACAO')),
    ativo BOOLEAN DEFAULT 1,
    criado_por TEXT,                   -- email de quem criou (self-ref nullable, sem FK para evitar circular)
    pendente BOOLEAN DEFAULT 0,        -- usuário aguardando aprovação

    -- LGPD / Tracking
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME,

    PRIMARY KEY (email, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id)
);

-- ====================================
-- TURMAS
-- Alinhado com: TurmaLocal
-- ====================================
DROP TABLE IF EXISTS turmas;
CREATE TABLE turmas (
    id TEXT NOT NULL,                  -- Ex: "1A-Matutino-2026" (gerado pelo app)
    escola_id TEXT NOT NULL,
    ano_letivo INTEGER NOT NULL,
    serie INTEGER,                     -- Número da série (1, 2, 3...)
    letra TEXT,                        -- Letra da turma (A, B, C...)
    turno TEXT,                        -- 'Matutino' | 'Vespertino' | 'Noturno'
    sala TEXT,                         -- Número/nome da sala
    professor_regente TEXT,            -- Nome do professor regente (opcional)
    sincronizado INTEGER DEFAULT 1,

    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id)
);

-- ====================================
-- ALUNOS
-- Alinhado com: AlunoLocal + LGPD
-- ====================================
DROP TABLE IF EXISTS alunos;
CREATE TABLE alunos (
    matricula TEXT NOT NULL,           -- Código SIGE
    escola_id TEXT NOT NULL,
    nome_completo TEXT,                -- NULL se anonimizado
    turma_id TEXT,
    ativo BOOLEAN DEFAULT 1,           -- true=ativo, false=inativo
    sincronizado INTEGER DEFAULT 1,

    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME,
    
    PRIMARY KEY (matricula, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id),
    FOREIGN KEY (turma_id, escola_id) REFERENCES turmas(id, escola_id)
);
CREATE INDEX idx_alunos_turma ON alunos(turma_id, escola_id);
CREATE INDEX idx_alunos_ativo ON alunos(ativo, escola_id);

-- ====================================
-- RESPONSÁVEIS
-- ====================================
DROP TABLE IF EXISTS responsaveis;
CREATE TABLE responsaveis (
    id TEXT NOT NULL,                  -- UUID
    escola_id TEXT NOT NULL,
    nome_completo TEXT,                -- NULL se anonimizado
    email TEXT,                        -- NULL se anonimizado

    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME,
    
    PRIMARY KEY (id, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id)
);

-- ====================================
-- VÍNCULOS RESPONSAVEL <-> ALUNO
-- ====================================
DROP TABLE IF EXISTS vinculos_responsavel_aluno;
CREATE TABLE vinculos_responsavel_aluno (
    responsavel_id TEXT NOT NULL,
    aluno_matricula TEXT NOT NULL,
    escola_id TEXT NOT NULL,
    data_vinculo DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (responsavel_id, aluno_matricula, escola_id),
    FOREIGN KEY (responsavel_id, escola_id) REFERENCES responsaveis(id, escola_id),
    FOREIGN KEY (aluno_matricula, escola_id) REFERENCES alunos(matricula, escola_id)
);

-- ====================================
-- REGISTROS DE ACESSO (CONTROLE DE ACESSO)
-- Alinhado com: RegistroAcessoLocal + filaOffline.service.ts
-- ====================================
DROP TABLE IF EXISTS registros_acesso;
CREATE TABLE registros_acesso (
    id TEXT NOT NULL,                  -- UUID gerado no tablet
    escola_id TEXT NOT NULL,
    aluno_matricula TEXT NOT NULL,
    tipo_movimentacao TEXT NOT NULL CHECK(tipo_movimentacao IN ('ENTRADA', 'SAIDA')),
    metodo_leitura TEXT DEFAULT 'qr_carteirinha', 
    timestamp_acesso DATETIME NOT NULL, 
    timestamp DATETIME,                
    sincronizado INTEGER DEFAULT 1,

    PRIMARY KEY (id, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id),
    FOREIGN KEY (aluno_matricula, escola_id) REFERENCES alunos(matricula, escola_id) ON DELETE CASCADE
);
CREATE INDEX idx_registros_acesso_aluno ON registros_acesso(aluno_matricula, escola_id);
CREATE INDEX idx_registros_acesso_data ON registros_acesso(timestamp_acesso DESC, escola_id);
CREATE INDEX idx_registros_acesso_tipo ON registros_acesso(tipo_movimentacao, escola_id);
CREATE INDEX idx_registros_acesso_sync ON registros_acesso(sincronizado);

-- ====================================
-- ALERTAS DE RISCO (Antiga Evasão)
-- ====================================
DROP TABLE IF EXISTS alertas_risco;
CREATE TABLE alertas_risco (
    id TEXT NOT NULL,                  -- UUID
    escola_id TEXT NOT NULL,
    aluno_matricula TEXT NOT NULL,
    motivo TEXT NOT NULL,
    status TEXT DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE', 'EM_ANALISE', 'RESOLVIDO')),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_resolucao DATETIME,

    PRIMARY KEY (id, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id),
    FOREIGN KEY (aluno_matricula, escola_id) REFERENCES alunos(matricula, escola_id) ON DELETE CASCADE
);
CREATE INDEX idx_alertas_risco_aluno ON alertas_risco(aluno_matricula, escola_id);
CREATE INDEX idx_alertas_risco_status ON alertas_risco(status, escola_id);

-- ====================================
-- LOGS DE AUDITORIA
-- ====================================
DROP TABLE IF EXISTS logs_auditoria;
CREATE TABLE logs_auditoria (
    id TEXT NOT NULL PRIMARY KEY,      -- UUID (chave simples — logs são globais)
    escola_id TEXT,                    
    usuario_email TEXT NOT NULL,
    acao TEXT NOT NULL,
    entidade_tipo TEXT NOT NULL,
    entidade_id TEXT,
    dados_anteriores TEXT,             -- JSON
    dados_novos TEXT,                  -- JSON
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,   
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP, 
    sincronizado INTEGER DEFAULT 0
);
CREATE INDEX idx_logs_timestamp ON logs_auditoria(timestamp DESC);
CREATE INDEX idx_logs_usuario ON logs_auditoria(usuario_email);
CREATE INDEX idx_logs_acao ON logs_auditoria(acao);
CREATE INDEX idx_logs_sync ON logs_auditoria(sincronizado);

-- ====================================
-- FILA DE PENDÊNCIAS (OFFLINE)
-- ====================================
DROP TABLE IF EXISTS fila_pendencias;
CREATE TABLE fila_pendencias (
    id TEXT PRIMARY KEY,
    escola_id TEXT,                    
    acao TEXT NOT NULL,               
    colecao TEXT NOT NULL,            
    dado_id TEXT NOT NULL,
    dados_extras TEXT,                -- JSON
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fila_colecao ON fila_pendencias(colecao);
CREATE INDEX idx_fila_timestamp ON fila_pendencias(timestamp);
