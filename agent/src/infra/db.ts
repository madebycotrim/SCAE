/**
 * infra/db.ts
 * Persistência local do Agente SCAE - Versão Assíncrona (SQLite3).
 * VERSÃO 3.1: Suporte a Reset de Emergência.
 */

import * as sqlite3 from 'sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let database: sqlite3.Database | null = null;

/**
 * Fecha o banco e deleta o arquivo físico se solicitado
 */
export async function resetarBancoLocal() {
    if (database) {
        return new Promise<void>((resolve) => {
            database?.close((err) => {
                if (err) console.error('[DB] Erro ao fechar para reset:', err.message);
                database = null;
                
                const dbDir = path.join(app.getPath('userData'), 'data');
                const dbPath = path.join(dbDir, 'catraki-agente-v3.db');
                
                try {
                    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
                    console.log('[DB] !!! BANCO DELETADO COM SUCESSO !!!');
                } catch (e: any) {
                    console.error('[DB] Erro ao deletar arquivo:', e.message);
                }
                resolve();
            });
        });
    }
}

export function getDb(): sqlite3.Database {
  if (database) return database;

  const dbDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'catraki-agente-v3.db');
  database = new sqlite3.Database(dbPath);

  database.serialize(() => {
    database?.run('PRAGMA journal_mode = WAL');
    database?.run('PRAGMA synchronous = NORMAL');

    database?.run(`
      CREATE TABLE IF NOT EXISTS registros_acesso (
        id TEXT PRIMARY KEY,
        leitor_id TEXT,
        escola_id TEXT NOT NULL,
        matricula TEXT NOT NULL,
        nome TEXT,
        tipo TEXT DEFAULT 'ENTRADA',
        autorizado INTEGER DEFAULT 1,
        timestamp_acesso DATETIME DEFAULT (datetime('now', 'localtime')),
        sincronizado INTEGER DEFAULT 0
      )
    `);

    database?.run(`CREATE TABLE IF NOT EXISTS cursores_leitura (leitor_id TEXT PRIMARY KEY, ultimo_evento_id TEXT, atualizado_em DATETIME DEFAULT (datetime('now', 'localtime')))`);
    database?.run(`CREATE TABLE IF NOT EXISTS alunos_cache (matricula TEXT NOT NULL, escola_id TEXT NOT NULL, nome_completo TEXT, turma_id TEXT, ativo INTEGER DEFAULT 1, atualizado_em DATETIME DEFAULT (datetime('now', 'localtime')), PRIMARY KEY (matricula, escola_id))`);
  });

  return database;
}

export function runSql(sql: string, params: any[] = []): Promise<void> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
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
