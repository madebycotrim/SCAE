-- schema.sql
-- SCAE: Multi-Tenant + LGPD compliance

-- ====================================
-- TENANTS (Escolas)
-- ====================================
DROP TABLE IF EXISTS tenants;
CREATE TABLE tenants (
    id TEXT PRIMARY KEY,               -- Slug da escola (ex: cem03-taguatinga)
    nome_escola TEXT NOT NULL,
    dominio_email TEXT,                -- Para validação de login admin (ex: @edu.se.df.gov.br)
    cor_primaria TEXT DEFAULT '#000000',
    cor_secundaria TEXT DEFAULT '#ffffff',
    tts_ativado BOOLEAN DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- CONSENTIMENTOS (LGPD)
-- ====================================
DROP TABLE IF EXISTS consentimentos;
CREATE TABLE consentimentos (
    id TEXT PRIMARY KEY,               -- UUID
    tenant_id TEXT NOT NULL,
    termo_versao TEXT NOT NULL,        -- Versão do termo aceito
    base_legal TEXT NOT NULL,          -- Ex: 'consentimento', 'obrigacao_legal', 'execucao_contrato', 'interesse_legitimo'
    finalidade_coleta TEXT NOT NULL,
    prazo_retencao_meses INTEGER NOT NULL,
    data_aceite DATETIME DEFAULT CURRENT_TIMESTAMP,
    revogado BOOLEAN DEFAULT 0,
    data_revogacao DATETIME,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ====================================
-- USUÁRIOS (Admin/Portaria/Coordenação)
-- ====================================
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
    email TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    nome_completo TEXT NOT NULL,
    papel TEXT NOT NULL CHECK(papel IN ('ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTARIA', 'VISUALIZACAO')),
    ativo BOOLEAN DEFAULT 1,
    
    -- LGPD / Tracking
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao DATETIME,
    data_exclusao DATETIME,
    
    PRIMARY KEY (email, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ====================================
-- TURMAS
-- ====================================
DROP TABLE IF EXISTS turmas;
CREATE TABLE turmas (
    id TEXT NOT NULL,                  -- Ex: "3A-2026"
    tenant_id TEXT NOT NULL,
    ano_letivo INTEGER NOT NULL,
    serie TEXT,
    letra TEXT,
    turno TEXT,
    
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ====================================
-- ALUNOS
-- ====================================
DROP TABLE IF EXISTS alunos;
CREATE TABLE alunos (
    matricula TEXT NOT NULL,           -- Código SIGE
    tenant_id TEXT NOT NULL,
    nome_completo TEXT,                -- NULL se anonimizado
    turma_id TEXT,
    status TEXT DEFAULT 'ATIVO',
    
    -- LGPD Columns
    id_consentimento TEXT,
    base_legal TEXT NOT NULL,
    finalidade_coleta TEXT NOT NULL,
    prazo_retencao_meses INTEGER NOT NULL,
    data_anonimizacao DATETIME,
    anonimizado BOOLEAN DEFAULT 0,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao DATETIME,
    data_exclusao DATETIME,
    
    PRIMARY KEY (matricula, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (turma_id, tenant_id) REFERENCES turmas(id, tenant_id),
    FOREIGN KEY (id_consentimento) REFERENCES consentimentos(id)
);
CREATE INDEX idx_alunos_turma ON alunos(turma_id, tenant_id);
CREATE INDEX idx_alunos_status ON alunos(status, tenant_id);

-- ====================================
-- RESPONSÁVEIS
-- ====================================
DROP TABLE IF EXISTS responsaveis;
CREATE TABLE responsaveis (
    id TEXT NOT NULL,                  -- UUID
    tenant_id TEXT NOT NULL,
    nome_completo TEXT,                -- NULL se anonimizado
    telefone TEXT,                     -- NULL se anonimizado
    email TEXT,                        -- NULL se anonimizado
    fcm_token TEXT,
    
    -- LGPD Columns
    id_consentimento TEXT,
    base_legal TEXT NOT NULL,
    finalidade_coleta TEXT NOT NULL,
    prazo_retencao_meses INTEGER NOT NULL,
    data_anonimizacao DATETIME,
    anonimizado BOOLEAN DEFAULT 0,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao DATETIME,
    data_exclusao DATETIME,
    
    PRIMARY KEY (id, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (id_consentimento) REFERENCES consentimentos(id)
);

-- ====================================
-- VÍNCULOS RESPONSAVEL <-> ALUNO
-- ====================================
DROP TABLE IF EXISTS vinculos_responsavel_aluno;
CREATE TABLE vinculos_responsavel_aluno (
    responsavel_id TEXT NOT NULL,
    aluno_matricula TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    data_vinculo DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (responsavel_id, aluno_matricula, tenant_id),
    FOREIGN KEY (responsavel_id, tenant_id) REFERENCES responsaveis(id, tenant_id),
    FOREIGN KEY (aluno_matricula, tenant_id) REFERENCES alunos(matricula, tenant_id)
);

-- ====================================
-- REGISTROS DE ACESSO (PORTARIA)
-- ====================================
DROP TABLE IF EXISTS registros_acesso;
CREATE TABLE registros_acesso (
    id TEXT NOT NULL,                  -- UUID do evento (gerado no tablet para idempotência)
    tenant_id TEXT NOT NULL,
    aluno_matricula TEXT NOT NULL,
    tipo_movimentacao TEXT NOT NULL CHECK(tipo_movimentacao IN ('ENTRADA', 'SAIDA')),
    metodo_leitura TEXT NOT NULL DEFAULT 'qr_celular', -- qr_celular, qr_carteirinha, manual
    timestamp_acesso DATETIME NOT NULL,
    sincronizado BOOLEAN DEFAULT 1,
    
    -- LGPD Columns
    prazo_retencao_meses INTEGER NOT NULL,
    data_anonimizacao DATETIME,
    anonimizado BOOLEAN DEFAULT 0,
    
    PRIMARY KEY (id, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (aluno_matricula, tenant_id) REFERENCES alunos(matricula, tenant_id)
);
CREATE INDEX idx_registros_acesso_aluno ON registros_acesso(aluno_matricula, tenant_id);
CREATE INDEX idx_registros_acesso_data ON registros_acesso(timestamp_acesso DESC, tenant_id);

-- ====================================
-- ALERTAS DE EVASÃO
-- ====================================
DROP TABLE IF EXISTS alertas_evasao;
CREATE TABLE alertas_evasao (
    id TEXT NOT NULL,                  -- UUID
    tenant_id TEXT NOT NULL,
    aluno_matricula TEXT NOT NULL,
    motivo TEXT NOT NULL,
    status TEXT DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE', 'EM_ANALISE', 'RESOLVIDO')),
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_resolucao DATETIME,
    
    PRIMARY KEY (id, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (aluno_matricula, tenant_id) REFERENCES alunos(matricula, tenant_id)
);
CREATE INDEX idx_alertas_evasao_aluno ON alertas_evasao(aluno_matricula, tenant_id);
CREATE INDEX idx_alertas_evasao_status ON alertas_evasao(status, tenant_id);

-- ====================================
-- LOGS DE AUDITORIA
-- ====================================
DROP TABLE IF EXISTS logs_auditoria;
CREATE TABLE logs_auditoria (
    id TEXT NOT NULL,                  -- UUID
    tenant_id TEXT NOT NULL,
    usuario_email TEXT NOT NULL,
    acao TEXT NOT NULL,
    entidade_tipo TEXT NOT NULL,
    entidade_id TEXT,
    dados_anteriores TEXT,             -- JSON
    dados_novos TEXT,                  -- JSON
    ip_address TEXT,
    user_agent TEXT,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
CREATE INDEX idx_logs_timestamp ON logs_auditoria(data_criacao DESC, tenant_id);
CREATE INDEX idx_logs_usuario ON logs_auditoria(usuario_email, tenant_id);

-- ====================================
-- FILA OFFLINE (RESERVADO PARA SINCRONIZAÇÃO)
-- ====================================
DROP TABLE IF EXISTS fila_pendencias;
CREATE TABLE fila_pendencias (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    acao TEXT NOT NULL,                -- 'DELETE', 'UPDATE'
    colecao TEXT NOT NULL,             -- 'alunos', 'turmas'
    dado_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
