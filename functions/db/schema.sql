PRAGMA foreign_keys = OFF;

-- Reset de Tabelas (Ordem Reversa de Dependência)
DROP TABLE IF EXISTS aluno_equipe;
DROP TABLE IF EXISTS grupos_equipe;
DROP TABLE IF EXISTS equipes;
DROP TABLE IF EXISTS vinculos_responsavel_aluno;
DROP TABLE IF EXISTS alertas_evasao;
DROP TABLE IF EXISTS alertas_risco;
DROP TABLE IF EXISTS registros_acesso;

DROP TABLE IF EXISTS alunos;
DROP TABLE IF EXISTS responsaveis;
DROP TABLE IF EXISTS turmas;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS logs_auditoria;
DROP TABLE IF EXISTS fila_pendencias;
DROP TABLE IF EXISTS calendario_letivo;
DROP TABLE IF EXISTS escolas;

-- ====================================
-- ESCOLAS (Unidades de Ensino)
-- ====================================
CREATE TABLE escolas (
    id TEXT PRIMARY KEY,               -- Slug da escola
    nome_escola TEXT NOT NULL,
    dominio_email TEXT,                -- Para validação de login
    provedor_auth TEXT DEFAULT 'google',
    cor_primaria TEXT DEFAULT '#000000',
    cor_secundaria TEXT DEFAULT '#ffffff',
    logo_url TEXT,
    -- Segurança e Identidade
    chave_publica_ecdsa TEXT,
    chave_privada_ecdsa TEXT,
    -- Configurações de Operação
    config_qr_dinamico BOOLEAN DEFAULT 0,
    tts_ativado BOOLEAN DEFAULT 1,
    config_tts_frase_sucesso TEXT DEFAULT 'Bem-vindo, {nome}!',
    config_tts_frase_erro TEXT DEFAULT 'Acesso negado.',
    saida_obrigatoria BOOLEAN DEFAULT 1,
    metodo_acesso TEXT DEFAULT 'QRCODE', -- 'QRCODE' | 'DIGITAL'
    limite_alunos INTEGER DEFAULT 1000,
    limite_terminais INTEGER DEFAULT 5,
    retencao_dados INTEGER DEFAULT 730,
    janelas TEXT DEFAULT '[]',
    status TEXT DEFAULT 'ATIVA' CHECK(status IN ('ATIVA', 'SUSPENSA', 'PENDENTE')),
    contato_suporte TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- USUÁRIOS (Admin/Coordenação)
-- ====================================
CREATE TABLE usuarios (
    email TEXT NOT NULL,
    escola_id TEXT NOT NULL,
    nome_completo TEXT,
    papel TEXT NOT NULL CHECK(papel IN ('CENTRAL', 'ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTEIRO', 'VISUALIZACAO')),
    ativo BOOLEAN DEFAULT 1,
    criado_por TEXT,
    pendente BOOLEAN DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME,
    PRIMARY KEY (email, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE
);

-- ====================================
-- TURMAS
-- ====================================
CREATE TABLE turmas (
    id TEXT NOT NULL,
    escola_id TEXT NOT NULL,
    ano_letivo INTEGER NOT NULL,
    serie INTEGER,
    letra TEXT,
    turno TEXT,
    sala TEXT,
    professor_regente TEXT,
    lotacao_maxima INTEGER DEFAULT 35,
    sincronizado INTEGER DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE
);

-- ====================================
-- ALUNOS
-- ====================================
CREATE TABLE alunos (
    matricula TEXT NOT NULL,
    escola_id TEXT NOT NULL,
    nome_completo TEXT,
    data_nascimento DATE,
    turma_id TEXT,
    ativo BOOLEAN DEFAULT 1,
    
    -- Biometria Digital
    biometria_cadastrada BOOLEAN DEFAULT 0,
    biometria_pendente_enroll BOOLEAN DEFAULT 0,
    
    sincronizado INTEGER DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME,
    PRIMARY KEY (matricula, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE,
    FOREIGN KEY (turma_id, escola_id) REFERENCES turmas(id, escola_id) ON DELETE CASCADE
);
CREATE INDEX idx_alunos_turma ON alunos(turma_id, escola_id);
CREATE INDEX idx_alunos_ativo ON alunos(ativo, escola_id);

-- ====================================
-- REGISTROS DE ACESSO
-- ====================================
CREATE TABLE registros_acesso (
    id TEXT NOT NULL,
    escola_id TEXT NOT NULL,
    aluno_matricula TEXT NOT NULL,
    tipo_movimentacao TEXT NOT NULL CHECK(tipo_movimentacao IN ('ENTRADA', 'SAIDA')),
    metodo_leitura TEXT DEFAULT 'qr_carteirinha', 
    id_evento_hardware TEXT,
    leitor_id TEXT,
    timestamp_acesso DATETIME NOT NULL, 
    timestamp DATETIME,                
    sincronizado INTEGER DEFAULT 1,
    PRIMARY KEY (id, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id)
);
CREATE INDEX idx_registros_acesso_data ON registros_acesso(timestamp_acesso DESC, escola_id);

-- ====================================
-- ALERTAS DE RISCO
-- ====================================
CREATE TABLE alertas_risco (
    id TEXT NOT NULL,
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

-- ====================================
-- ALERTAS DE EVASÃO (REDE DE PROTEÇÃO ART 70 ECA)
-- ====================================
CREATE TABLE alertas_evasao (
    id TEXT NOT NULL,
    escola_id TEXT NOT NULL,
    aluno_matricula TEXT NOT NULL,
    motivo TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE', 'EM_ANALISE', 'RESOLVIDO')),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_resolucao DATETIME,
    PRIMARY KEY (id, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE,
    FOREIGN KEY (aluno_matricula, escola_id) REFERENCES alunos(matricula, escola_id) ON DELETE CASCADE
);
CREATE INDEX idx_alertas_evasao_escola ON alertas_evasao(escola_id);
CREATE INDEX idx_alertas_evasao_aluno ON alertas_evasao(aluno_matricula, escola_id);
CREATE INDEX idx_alertas_evasao_status ON alertas_evasao(status);

-- ====================================
-- LOGS DE AUDITORIA
-- ====================================
CREATE TABLE logs_auditoria (
    id TEXT NOT NULL PRIMARY KEY,
    escola_id TEXT,                    
    usuario_email TEXT NOT NULL,
    acao TEXT NOT NULL,
    entidade_tipo TEXT NOT NULL,
    entidade_id TEXT,
    dados_anteriores TEXT,
    dados_novos TEXT,
    ip_address TEXT,
    user_agent TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    sincronizado INTEGER DEFAULT 0
);
CREATE INDEX idx_logs_timestamp ON logs_auditoria(criado_em DESC);

-- ====================================
-- CALENDÁRIO LETIVO
-- ====================================
CREATE TABLE calendario_letivo (
    data DATE NOT NULL,
    escola_id TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT DEFAULT 'FERIADO',
    PRIMARY KEY (data, escola_id),
    FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE
);

PRAGMA foreign_keys = ON;

-- DADOS INICIAIS (SEED)
INSERT OR IGNORE INTO escolas (id, nome_escola, status)
VALUES ('cem03-taguatinga', 'Unidade de Teste CATRAKI', 'ATIVA');

INSERT OR IGNORE INTO usuarios (email, escola_id, nome_completo, papel, ativo)
VALUES ('madebycotrim@gmail.com', 'cem03-taguatinga', 'Desenvolvedor Root', 'CENTRAL', 1);
