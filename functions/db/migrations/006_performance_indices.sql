-- Migration: 006_performance_indices.sql
-- Índices de performance para queries frequentes no D1

-- Registros de acesso: busca por aluno e por data
CREATE INDEX IF NOT EXISTS idx_registros_aluno_escola ON registros_acesso(aluno_matricula, escola_id);
CREATE INDEX IF NOT EXISTS idx_registros_timestamp ON registros_acesso(timestamp_acesso, escola_id);

-- Alertas de evasão: busca por status e aluno
CREATE INDEX IF NOT EXISTS idx_alertas_evasao_aluno ON alertas_evasao(aluno_matricula, escola_id, status);

-- Logs de auditoria: busca por escola e data
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_escola_data ON logs_auditoria(escola_id, criado_em);
