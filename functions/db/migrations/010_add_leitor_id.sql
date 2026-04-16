-- Migração 010: Adicionando leitor_id aos registros de acesso para identificar origem (Agente Local)
ALTER TABLE registros_acesso ADD COLUMN leitor_id TEXT;
ALTER TABLE registros_acesso ADD COLUMN id_evento_hardware TEXT; -- ID incremental do equipamento

-- Criando índice para auditoria por equipamento
CREATE INDEX IF NOT EXISTS idx_registros_acesso_leitor ON registros_acesso(leitor_id, escola_id);
