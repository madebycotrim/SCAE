/**
 * infra/db.ts
 * Camada de persistência local SQLite redundante para modo Offline.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

/** Inicializa e retorna a conexão com o banco local */
export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'scae-agent-v2.db');
    db = new Database(dbPath);
    
    // Otimizações para performance de escrita e segurança de dados
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');

    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    -- Tabela de registros de acesso (Cache de leitura local)
    CREATE TABLE IF NOT EXISTS registros_acesso (
      id TEXT NOT NULL PRIMARY KEY,
      escola_id TEXT NOT NULL,
      aluno_matricula TEXT NOT NULL,
      tipo_movimentacao TEXT NOT NULL CHECK(tipo_movimentacao IN ('ENTRADA', 'SAIDA')),
      metodo_leitura TEXT DEFAULT 'BIO',
      timestamp_acesso DATETIME NOT NULL,
      sincronizado INTEGER DEFAULT 0,
      leitor_id TEXT,
      id_evento_hardware TEXT,
      criado_em DATETIME DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_registros_sync ON registros_acesso(sincronizado);
    CREATE INDEX IF NOT EXISTS idx_registros_ordem ON registros_acesso(timestamp_acesso DESC);

    -- Cache de Alunos (Sincronizado da Nuvem para funcionamento offline)
    CREATE TABLE IF NOT EXISTS alunos_cache (
      matricula TEXT NOT NULL,
      escola_id TEXT NOT NULL,
      nome_completo TEXT,
      turma_id TEXT,
      ativo INTEGER DEFAULT 1,
      id_interno_bio INTEGER,
      vetor_facial TEXT, -- Hashes faciais 128d (JSON string)
      atualizado_em DATETIME DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (matricula, escola_id)
    );

    -- Cursor de leitura dos equipamentos (Evita duplicidade ao reler logs)
    CREATE TABLE IF NOT EXISTS cursores_leitura (
      leitor_id TEXT NOT NULL PRIMARY KEY,
      ultimo_evento_id TEXT NOT NULL,
      atualizado_em DATETIME DEFAULT (datetime('now', 'localtime'))
    );
  `);
}
