/**
 * infra/db.ts
 * Persistência local do Agente SCAE - Versão Assíncrona (SQLite3).
 */

import * as sqlite3 from 'sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let database: sqlite3.Database | null = null;

export function getDb(): sqlite3.Database {
  if (database) return database;

  const dbDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'scae-agent-v2.db');
  console.log(`[DB] Banco de dados localizado em: ${dbPath}`);
  
  database = new sqlite3.Database(dbPath);

  database.serialize(() => {
    database?.run('PRAGMA journal_mode = WAL');
    database?.run('PRAGMA synchronous = NORMAL');

    // 1. Cria a tabela se não existir (ESTRUTURA COMPLETA V3)
    database?.run(`
      CREATE TABLE IF NOT EXISTS registros_acesso (
        id TEXT PRIMARY KEY,
        leitor_id TEXT,
        matricula TEXT NOT NULL DEFAULT '---',
        nome TEXT,
        tipo TEXT NOT NULL DEFAULT 'ENTRADA',
        autorizado INTEGER DEFAULT 1,
        timestamp_acesso DATETIME DEFAULT (datetime('now', 'localtime')),
        sincronizado INTEGER DEFAULT 0
      )
    `);

    // ⚡ AUTO-REPAIR: Se a tabela existir mas faltar a coluna 'matricula', adiciona agora.
    database?.run("ALTER TABLE registros_acesso ADD COLUMN matricula TEXT NOT NULL DEFAULT '---'", (err) => {
        if (!err) console.log('[DB] SQL Fix: Coluna "matricula" adicionada com sucesso.');
    });

    database?.run("ALTER TABLE registros_acesso ADD COLUMN nome TEXT", (err) => {
        if (!err) console.log('[DB] SQL Fix: Coluna "nome" adicionada com sucesso.');
    });

    database?.run("ALTER TABLE registros_acesso ADD COLUMN tipo TEXT NOT NULL DEFAULT 'ENTRADA'", (err) => {
        if (!err) console.log('[DB] SQL Fix: Coluna "tipo" adicionada com sucesso.');
    });

    // Outras tabelas essenciais
    database?.run(`
      CREATE TABLE IF NOT EXISTS cursores_leitura (
        leitor_id TEXT PRIMARY KEY,
        ultimo_evento_id TEXT,
        atualizado_em DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    database?.run(`
      CREATE TABLE IF NOT EXISTS alunos_cache (
        matricula TEXT NOT NULL,
        escola_id TEXT NOT NULL,
        nome_completo TEXT,
        turma_id TEXT,
        ativo INTEGER DEFAULT 1,
        atualizado_em DATETIME DEFAULT (datetime('now', 'localtime')),
        PRIMARY KEY (matricula, escola_id)
      )
    `);
  });

  return database;
}

export function runSql(sql: string, params: any[] = []): Promise<void> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err: Error | null) => {
      if (err) {
        // Ignora erro de "coluna já existe" durante o auto-repair inicial
        if (err.message.includes('duplicate column name')) {
            resolve();
            return;
        }
        console.error(`[SQLite Error] Query: ${sql} | Erro:`, err.message);
        reject(err);
      } else resolve();
    });
  });
}

export function getSql<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: any) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export function allSql<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}
