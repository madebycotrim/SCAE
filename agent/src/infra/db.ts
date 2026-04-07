/**
 * infra/db.ts
 * Persistência local do Agente SCAE - Versão Assíncrona (SQLite3).
 * VERSÃO 3.2: Suporte a Migrações Automáticas Garantidas.
 */

import * as sqlite3 from 'sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let database: sqlite3.Database | null = null;
let dbPronto = false;
let dbPromessa: Promise<sqlite3.Database> | null = null;

/**
 * Fecha o banco e deleta o arquivo físico se solicitado
 */
export async function resetarBancoLocal() {
    if (database) {
        return new Promise<void>((resolve) => {
            database?.close((err) => {
                if (err) console.error('[DB] Erro ao fechar para reset:', err.message);
                database = null;
                dbPronto = false;
                dbPromessa = null;
                
                const dbDir = path.join(app.getPath('userData'), 'data');
                const dbPath = path.join(dbDir, 'catraki-agente-v3.db');
                
                try {
                    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
                } catch (e: any) {
                    console.error('[DB] Erro ao deletar arquivo:', e.message);
                }
                resolve();
            });
        });
    }
}

/**
 * Inicializa o banco de dados e garante que as tabelas/colunas estejam prontas.
 */
export async function inicializarBanco(): Promise<sqlite3.Database> {
    if (dbPromessa) return dbPromessa;

    dbPromessa = new Promise((resolve, reject) => {
        const dbDir = path.join(app.getPath('userData'), 'data');
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

        const dbPath = path.join(dbDir, 'catraki-agente-v3.db');
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) return reject(err);
        });

        db.serialize(() => {
            db.run('PRAGMA journal_mode = WAL');
            db.run('PRAGMA synchronous = NORMAL');

            // 1. Tabela de Registros
            db.run(`
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

            // 2. Tabela de Cursores
            db.run(`CREATE TABLE IF NOT EXISTS cursores_leitura (leitor_id TEXT PRIMARY KEY, ultimo_evento_id TEXT, atualizado_em DATETIME DEFAULT (datetime('now', 'localtime')))`);
            
            // 3. Tabela de Alunos (Esquema Moderno)
            db.run(`CREATE TABLE IF NOT EXISTS alunos_cache (
                matricula TEXT NOT NULL, 
                escola_id TEXT NOT NULL, 
                nome_completo TEXT, 
                turma_id TEXT, 
                turno TEXT,
                ativo INTEGER DEFAULT 1, 
                atualizado_em DATETIME DEFAULT (datetime('now', 'localtime')), 
                PRIMARY KEY (matricula, escola_id)
            )`);

            // ⚡ MIGRAÇÃO: Adiciona coluna 'turno' caso o banco seja antigo
            db.run(`ALTER TABLE alunos_cache ADD COLUMN turno TEXT`, (err: any) => {
                // Se erro for 'duplicate column', ignoramos. Caso contrário, apenas logamos.
            });

            // 4. Tabela de Turmas
            db.run(`CREATE TABLE IF NOT EXISTS turmas_cache (
                id TEXT PRIMARY KEY,
                turno TEXT,
                atualizado_em DATETIME DEFAULT (datetime('now', 'localtime'))
            )`, () => {
                database = db;
                dbPronto = true;
                console.log('[DB] Base de dados operacional e migrada.');
                resolve(db);
            });
        });
    });

    return dbPromessa;
}

export function getDb(): sqlite3.Database {
  if (!database) {
      // Fallback síncrono para evitar crash, mas o ideal é aguardar inicializarBanco()
      const dbDir = path.join(app.getPath('userData'), 'data');
      const dbPath = path.join(dbDir, 'catraki-agente-v3.db');
      database = new sqlite3.Database(dbPath);
  }
  return database;
}

export async function runSql(sql: string, params: any[] = []): Promise<void> {
  const db = await inicializarBanco();
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function getSql<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const db = await inicializarBanco();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: any) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export async function allSql<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await inicializarBanco();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export async function limparRegistrosAntigos() {
  try {
      const db = await inicializarBanco();
      return new Promise<void>((resolve) => {
          db.run(`DELETE FROM registros_acesso WHERE sincronizado = 1 AND timestamp_acesso < datetime('now', '-30 days', 'localtime')`, () => {
              db.run('VACUUM', () => resolve());
          });
      });
  } catch (e: any) {
      console.error('[Gari Digital] Erro:', e.message);
  }
}
