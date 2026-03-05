-- Migration: 002_add_fcm_token_responsaveis.sql
-- Objetivo: Adicionar suporte para notificações push via FCM no Portal do Responsável.

ALTER TABLE responsaveis ADD COLUMN fcm_token TEXT;
