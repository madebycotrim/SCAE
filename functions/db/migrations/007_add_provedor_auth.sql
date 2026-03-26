-- Migração 007: Adiciona provedor de autenticação (Google vs Microsoft) na tabela de escolas
ALTER TABLE escolas ADD COLUMN provedor_auth TEXT DEFAULT 'google';
