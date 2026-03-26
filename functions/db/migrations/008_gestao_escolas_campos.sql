-- Migração 008: Adiciona campos estendidos de configuração de escolas (LGPD, limites e operacionais)
ALTER TABLE escolas ADD COLUMN config_qr_dinamico BOOLEAN DEFAULT 0;
ALTER TABLE escolas ADD COLUMN tts_ativado BOOLEAN DEFAULT 1;
ALTER TABLE escolas ADD COLUMN saida_obrigatoria BOOLEAN DEFAULT 1;
ALTER TABLE escolas ADD COLUMN metodo_acesso TEXT DEFAULT 'QRCODE';
ALTER TABLE escolas ADD COLUMN limite_alunos INTEGER DEFAULT 1000;
ALTER TABLE escolas ADD COLUMN limite_terminais INTEGER DEFAULT 5;
ALTER TABLE escolas ADD COLUMN retencao_dados INTEGER DEFAULT 730;
ALTER TABLE escolas ADD COLUMN contato_suporte TEXT;
ALTER TABLE escolas ADD COLUMN janelas TEXT DEFAULT '[]';
