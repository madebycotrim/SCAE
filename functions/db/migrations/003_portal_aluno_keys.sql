-- Adiciona data de nascimento para validação do portal do aluno
ALTER TABLE alunos ADD COLUMN data_nascimento DATE;

-- Adiciona chave privada ECDSA para assinatura de QR Codes (uso interno do backend)
ALTER TABLE escolas ADD COLUMN chave_privada_ecdsa TEXT;

-- Adiciona flag para escolha entre QR Fixo ou Dinâmico
ALTER TABLE escolas ADD COLUMN config_qr_dinamico BOOLEAN DEFAULT 0;
