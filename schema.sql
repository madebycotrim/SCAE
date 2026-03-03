-- schema.sql
-- SCAE: Multi-Tenant + LGPD compliance
-- Alinhado com bancoLocal.tipos.ts e sincronizacao.ts (v2026-03)

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
    base_legal TEXT NOT NULL,          -- 'consentimento' | 'obrigacao_legal' | 'execucao_contrato' | 'interesse_legitimo'
    finalidade_coleta TEXT NOT NULL,
    prazo_retencao_meses INTEGER NOT NULL,
    data_aceite DATETIME DEFAULT CURRENT_TIMESTAMP,
    revogado BOOLEAN DEFAULT 0,
    data_revogacao DATETIME,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ====================================
-- USUÁRIOS (Admin/Portaria/Coordenação)
-- Alinhado com: UsuarioLocal + PapelUsuario
-- ====================================
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
    email TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    nome_completo TEXT,                -- opcional no tipo local
    papel TEXT NOT NULL CHECK(papel IN ('AGM', 'ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTARIA', 'VISUALIZACAO')),
    ativo BOOLEAN DEFAULT 1,
    criado_por TEXT,                   -- email de quem criou (self-ref nullable, sem FK para evitar circular)
    pendente BOOLEAN DEFAULT 0,        -- usuário aguardando aprovação

    -- LGPD / Tracking
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME,
    data_exclusao DATETIME,

    PRIMARY KEY (email, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ====================================
-- TURMAS
-- Alinhado com: TurmaLocal
-- ====================================
DROP TABLE IF EXISTS turmas;
CREATE TABLE turmas (
    id TEXT NOT NULL,                  -- Ex: "1A-Matutino-2026" (gerado pelo app)
    tenant_id TEXT NOT NULL,
    ano_letivo INTEGER NOT NULL,
    serie INTEGER,                     -- Número da série (1, 2, 3...)
    letra TEXT,                        -- Letra da turma (A, B, C...)
    turno TEXT,                        -- 'Matutino' | 'Vespertino' | 'Noturno'
    sala TEXT,                         -- Número/nome da sala
    professor_regente TEXT,            -- Nome do professor regente (opcional)
    sincronizado INTEGER DEFAULT 1,

    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ====================================
-- ALUNOS
-- Alinhado com: AlunoLocal + LGPD
-- ====================================
DROP TABLE IF EXISTS alunos;
CREATE TABLE alunos (
    matricula TEXT NOT NULL,           -- Código SIGE
    tenant_id TEXT NOT NULL,
    nome_completo TEXT,                -- NULL se anonimizado
    turma_id TEXT,
    ativo BOOLEAN DEFAULT 1,           -- true=ativo, false=inativo (substitui campo 'status')
    sincronizado INTEGER DEFAULT 1,

    -- LGPD Columns
    id_consentimento TEXT,
    base_legal TEXT NOT NULL DEFAULT 'execucao_contrato',
    finalidade_coleta TEXT NOT NULL DEFAULT 'Controle de acesso escolar',
    prazo_retencao_meses INTEGER NOT NULL DEFAULT 60,
    data_anonimizacao DATETIME,
    anonimizado BOOLEAN DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME,
    data_exclusao DATETIME,

    PRIMARY KEY (matricula, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (turma_id, tenant_id) REFERENCES turmas(id, tenant_id),
    FOREIGN KEY (id_consentimento) REFERENCES consentimentos(id)
);
CREATE INDEX idx_alunos_turma ON alunos(turma_id, tenant_id);
CREATE INDEX idx_alunos_ativo ON alunos(ativo, tenant_id);

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
    base_legal TEXT NOT NULL DEFAULT 'consentimento',
    finalidade_coleta TEXT NOT NULL DEFAULT 'Notificação de acesso escolar ao responsável',
    prazo_retencao_meses INTEGER NOT NULL DEFAULT 60,
    data_anonimizacao DATETIME,
    anonimizado BOOLEAN DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME,
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
-- Alinhado com: RegistroAcessoLocal + filaOffline.service.ts
-- Campos: id, aluno_matricula, tipo_movimentacao, timestamp (local) = timestamp_acesso (servidor)
-- ====================================
DROP TABLE IF EXISTS registros_acesso;
CREATE TABLE registros_acesso (
    id TEXT NOT NULL,                  -- UUID gerado no tablet (idempotência offline)
    tenant_id TEXT NOT NULL,
    aluno_matricula TEXT NOT NULL,
    tipo_movimentacao TEXT NOT NULL CHECK(tipo_movimentacao IN ('ENTRADA', 'SAIDA')),
    metodo_leitura TEXT DEFAULT 'qr_celular', -- qr_celular | qr_carteirinha | manual
    timestamp_acesso DATETIME NOT NULL, -- campo canônico no servidor
    timestamp DATETIME,                -- alias aceito vindo do app local (nullable)
    sincronizado INTEGER DEFAULT 1,

    -- LGPD Columns
    prazo_retencao_meses INTEGER DEFAULT 60,
    data_anonimizacao DATETIME,
    anonimizado BOOLEAN DEFAULT 0,

    PRIMARY KEY (id, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (aluno_matricula, tenant_id) REFERENCES alunos(matricula, tenant_id) ON DELETE CASCADE
);
CREATE INDEX idx_registros_acesso_aluno ON registros_acesso(aluno_matricula, tenant_id);
CREATE INDEX idx_registros_acesso_data ON registros_acesso(timestamp_acesso DESC, tenant_id);
CREATE INDEX idx_registros_acesso_tipo ON registros_acesso(tipo_movimentacao, tenant_id);
CREATE INDEX idx_registros_acesso_sync ON registros_acesso(sincronizado);

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
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_resolucao DATETIME,

    PRIMARY KEY (id, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (aluno_matricula, tenant_id) REFERENCES alunos(matricula, tenant_id) ON DELETE CASCADE
);
CREATE INDEX idx_alertas_evasao_aluno ON alertas_evasao(aluno_matricula, tenant_id);
CREATE INDEX idx_alertas_evasao_status ON alertas_evasao(status, tenant_id);

-- ====================================
-- LOGS DE AUDITORIA
-- Alinhado com: EsquemaSCAE.logs_auditoria (bancoLocal.tipos.ts)
-- Campos locais: id, timestamp, created_at, usuario_email, acao, entidade_tipo,
--                entidade_id, dados_anteriores, dados_novos, ip_address, user_agent, sincronizado
-- ====================================
DROP TABLE IF EXISTS logs_auditoria;
CREATE TABLE logs_auditoria (
    id TEXT NOT NULL PRIMARY KEY,      -- UUID (chave simples — logs são globais, não por tenant)
    tenant_id TEXT,                    -- nullable: logs locais offline podem não ter tenant_id
    usuario_email TEXT NOT NULL,
    acao TEXT NOT NULL,
    entidade_tipo TEXT NOT NULL,
    entidade_id TEXT,
    dados_anteriores TEXT,             -- JSON
    dados_novos TEXT,                  -- JSON
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,   -- campo usado pelo app local
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- alias para compatibilidade
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP, -- campo canônico
    sincronizado INTEGER DEFAULT 0
);
CREATE INDEX idx_logs_timestamp ON logs_auditoria(timestamp DESC);
CREATE INDEX idx_logs_usuario ON logs_auditoria(usuario_email);
CREATE INDEX idx_logs_acao ON logs_auditoria(acao);
CREATE INDEX idx_logs_sync ON logs_auditoria(sincronizado);

-- ====================================
-- FILA DE PENDÊNCIAS (OFFLINE)
-- Alinhado com: EsquemaSCAE.fila_pendencias
-- ====================================
DROP TABLE IF EXISTS fila_pendencias;
CREATE TABLE fila_pendencias (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,                    -- nullable: operação offline pode não ter tenant ainda
    acao TEXT NOT NULL,               -- 'DELETE' | 'UPDATE' | 'CREATE'
    colecao TEXT NOT NULL,            -- 'alunos' | 'turmas' | 'registros_acesso'
    dado_id TEXT NOT NULL,
    dados_extras TEXT,                -- JSON (Record<string, unknown> serializado)
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fila_colecao ON fila_pendencias(colecao);
CREATE INDEX idx_fila_timestamp ON fila_pendencias(timestamp);
