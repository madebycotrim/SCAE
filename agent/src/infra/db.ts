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
                const dbWal = dbPath + '-wal';
                const dbShm = dbPath + '-shm';
                
                try {
                    // Espera 100ms para o SQLite soltar os arquivos reais antes de deletar
                    setTimeout(() => {
                        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
                        if (fs.existsSync(dbWal)) fs.unlinkSync(dbWal);
                        if (fs.existsSync(dbShm)) fs.unlinkSync(dbShm);
                        console.log('[DB] !!! BANCO DELETADO COM SUCESSO (INCLUINDO WAL) !!!');
                    }, 100);
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
    
    // Tabela de Alunos com Turno
    database?.run(`CREATE TABLE IF NOT EXISTS alunos_cache (
        matricula TEXT NOT NULL, 
        escola_id TEXT NOT NULL, 
        nome_completo TEXT, 
        turma_id TEXT, 
        turno TEXT,
        ativo INTEGER DEFAULT 1, 
        atualizado_em DATETIME DEFAULT (datetime('now', 'localtime')), 
        PRIMARY KEY (matricula, escola_id)
    )`);

    // Tabela de Turmas para busca rápida
    database?.run(`CREATE TABLE IF NOT EXISTS turmas_cache (
        id TEXT PRIMARY KEY,
        turno TEXT,
        atualizado_em DATETIME DEFAULT (datetime('now', 'localtime'))
    )`);
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

/**
 * Gari Digital: Limpa registros com mais de 30 dias que já foram sincronizados.
 * Também executa o comando VACUUM para otimizar o espaço físico em disco.
 */
export async function limparRegistrosAntigos() {
  console.log('[Gari Digital] Iniciando varredura de manutenção...');
  try {
      const db = getDb();
      return new Promise<void>((resolve, reject) => {
          // 1. Remove apenas o que já está na nuvem e tem mais de 30 dias
          db.run(`
              DELETE FROM registros_acesso 
              WHERE sincronizado = 1 
              AND timestamp_acesso < datetime('now', '-30 days', 'localtime')
          `, (err) => {
              if (err) {
                  console.error('[Gari Digital] ✗ Erro ao limpar registros antigos:', err.message);
                  reject(err);
              } else {
                  console.log('[Gari Digital] 🧹 Registros antigos removidos com sucesso.');
                  
                  // 2. Otimiza o banco (libera espaço físico)
                  db.run('VACUUM', (vErr) => {
                      if (vErr) console.warn('[Gari Digital] Otimização VACUUM falhou:', vErr.message);
                      else console.log('[Gari Digital] ✓ Banco de dados otimizado (VACUUM).');
                      resolve();
                  });
              }
          });
      });
  } catch (e: any) {
      console.error('[Gari Digital] Falha crítica no ciclo de limpeza:', e.message);
  }
}
