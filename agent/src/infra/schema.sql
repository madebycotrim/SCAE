-- schema.sql
-- SCAE: Cloudflare D1 Database Schema v1.5
-- Rodar: npx wrangler d1 execute scae_db --local --file=schema.sql

-- schema.sql v1.6 (Seguro - Não apaga tabelas existentes)

-- 1. ESTRUTURA JÁ ATUALIZADA (Pulando ALTER TABLES)
-- As colunas agente_api_key e agente_pin já foram adicionadas nas rodadas anteriores.

-- 2. GARANTIR ESTRUTURA DOS TERMINAIS (O Agente precisa desta tabela)
CREATE TABLE IF NOT EXISTS terminais (
    id TEXT PRIMARY KEY,
    escola_id TEXT NOT NULL,
    config_leitores TEXT,
    status TEXT DEFAULT 'OFFLINE',
    ultima_comunicacao DATETIME,
    FOREIGN KEY(escola_id) REFERENCES escolas(id)
);

-- 3. GARANTIR ESTRUTURA DE REGISTROS DE ACESSO
CREATE TABLE IF NOT EXISTS registros_acesso (
    id TEXT PRIMARY KEY,
    escola_id TEXT NOT NULL,
    aluno_matricula TEXT NOT NULL,
    tipo_movimentacao TEXT NOT NULL,
    metodo_leitura TEXT,
    timestamp_acesso DATETIME NOT NULL,
    leitor_id TEXT,
    id_evento_hardware TEXT,
    sincronizado INTEGER DEFAULT 1,
    processado_presenca INTEGER DEFAULT 0,
    criado_em DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(escola_id) REFERENCES escolas(id)
);

-- DADOS DE TESTE (Modo Local)
UPDATE escolas SET agente_pin = '123456', agente_api_key = 'catraki_dev_token' 
WHERE id = 'cem03-taguatinga';

INSERT OR IGNORE INTO escolas (id, nome_escola, agente_pin, agente_api_key) 
VALUES ('cem03-taguatinga', 'CEM 03 - Taguatinga', '123456', 'catraki_dev_token');

INSERT OR IGNORE INTO terminais (id, escola_id, config_leitores) 
VALUES ('terminal-principal', 'cem03-taguatinga', '[]');
