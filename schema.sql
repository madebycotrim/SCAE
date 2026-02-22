-- Tabela de Turmas (Enhanced Context)
DROP TABLE IF EXISTS turmas;
CREATE TABLE turmas (
  id TEXT PRIMARY KEY, -- Ex: "3ª A - Matutino" (Composite Key for compatibility)
  ano_letivo INTEGER, -- Ex: 2026
  serie TEXT, -- Ex: "1ª", "2ª", "3ª"
  letra TEXT, -- Ex: "A", "B", "C"
  turno TEXT, -- Ex: "Matutino", "Vespertino"
  sala TEXT, -- Local físico (Opcional)
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Alunos (Essential Data)
DROP TABLE IF EXISTS alunos;
CREATE TABLE alunos (
  matricula TEXT PRIMARY KEY, -- Identificador Único
  nome_completo TEXT NOT NULL, -- Identificação Básica
  turma_id TEXT, -- Vínculo com a Turma
  status TEXT DEFAULT 'ATIVO', -- ATIVO/INATIVO (Controle de Acesso)
  sincronizado INTEGER DEFAULT 0, -- 0: Pendente, 1: Sincronizado
  FOREIGN KEY (turma_id) REFERENCES turmas(id)
);

-- Tabela de Registros de Acesso (Audit Trail)
DROP TABLE IF EXISTS registros_acesso;
CREATE TABLE registros_acesso (
  id TEXT PRIMARY KEY,
  aluno_matricula TEXT NOT NULL,
  tipo_movimentacao TEXT CHECK(tipo_movimentacao IN ('ENTRADA', 'SAIDA')) NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  sincronizado INTEGER DEFAULT 0, -- 0: Pendente, 1: Sincronizado
  autorizado_por TEXT, -- Quem liberou, se manual (Accountability)
  metodo_validacao TEXT -- QR Code, Manual, etc
);

-- Tabela de Fila de Pendências (Para Delezões e Ações Offline)
DROP TABLE IF EXISTS fila_pendencias;
CREATE TABLE fila_pendencias (
  id TEXT PRIMARY KEY,
  acao TEXT NOT NULL, -- 'DELETE', 'UPDATE'
  colecao TEXT NOT NULL, -- 'alunos', 'turmas'
  dado_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);



-- ====================================
-- AUDITORIA E USUÁRIOS
-- ====================================

-- Logs de Auditoria
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    usuario_email TEXT NOT NULL,
    acao TEXT NOT NULL,
    entidade_tipo TEXT NOT NULL,
    entidade_id TEXT,
    dados_anteriores TEXT,
    dados_novos TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs_auditoria(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_auditoria(usuario_email);
CREATE INDEX IF NOT EXISTS idx_logs_acao ON logs_auditoria(acao);
CREATE INDEX IF NOT EXISTS idx_logs_entidade ON logs_auditoria(entidade_tipo, entidade_id);

-- Usuários e Controle de Acesso (RBAC)
CREATE TABLE IF NOT EXISTS usuarios (
    email TEXT PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    papel TEXT NOT NULL CHECK(papel IN ('ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTARIA', 'VISUALIZACAO')),
    role TEXT, -- Legacy/Compatibility (Optional)
    ativo BOOLEAN DEFAULT 1,
    criado_por TEXT,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_papel ON usuarios(papel);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
