/**
 * infra/db.ts
 * Persistência local do Agente SCAE - Versão Assíncrona (SQLite3).
 * Garante funcionamento offline e cache seguro de biometria.
 */

import * as sqlite3 from 'sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let database: sqlite3.Database | null = null;

/** Inicializa e retorna a conexão com o banco de dados local */
export function getDb(): sqlite3.Database {
  if (database) return database;

  // No Windows, salva em %AppData%/scae-agent/data/scae-agent-v2.db
  const dbDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'scae-agent-v2.db');
  database = new sqlite3.Database(dbPath);

  // Ativar WAL mode para alta performance e concorrência (se suportado pelo driver local)
  database.serialize(() => {
    database?.run('PRAGMA journal_mode = WAL');
    database?.run('PRAGMA synchronous = NORMAL');

    // Tabela de Registros de Acesso (Buffer Local para Sincronização)
    database?.run(`
      CREATE TABLE IF NOT EXISTS registros_acesso (
        id TEXT PRIMARY KEY,
        escola_id TEXT NOT NULL,
        aluno_matricula TEXT NOT NULL,
        tipo_movimentacao TEXT NOT NULL,
        metodo_leitura TEXT,
        timestamp_acesso DATETIME NOT NULL,
        leitor_id TEXT,
        id_evento_hardware TEXT,
        sincronizado INTEGER DEFAULT 0
      )
    `);

    // Tabela de Cursores (Onde paramos a leitura em cada equipamento)
    database?.run(`
      CREATE TABLE IF NOT EXISTS cursores_leitura (
        leitor_id TEXT PRIMARY KEY,
        ultimo_evento_id TEXT,
        atualizado_em DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    // Cache de Alunos (Sincronizado da Nuvem para funcionamento offline)
    database?.run(`
      CREATE TABLE IF NOT EXISTS alunos_cache (
        matricula TEXT NOT NULL,
        escola_id TEXT NOT NULL,
        nome_completo TEXT,
        turma_id TEXT,
        ativo INTEGER DEFAULT 1,
        vetor_facial TEXT,
        atualizado_em DATETIME DEFAULT (datetime('now', 'localtime')),
        PRIMARY KEY (matricula, escola_id)
      )
    `);
  });

  return database;
}

/** Wrapper para executar comandos com Promises */
export function runSql(sql: string, params: any[] = []): Promise<void> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** Wrapper para buscar um único registro */
export function getSql<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: any) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

/** Wrapper para buscar múltiplos registros */
export function allSql<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}
