-- Migration: 005_add_lotacao_maxima_turmas.sql
-- Adiciona coluna de lotação máxima para controle de ocupação
ALTER TABLE turmas ADD COLUMN lotacao_maxima INTEGER DEFAULT 40;
