/**
 * infra/db.ts
 * Persistência local do Agente SCAE - Versão Assíncrona (SQLite3).
 * Persistência local do Agente SCAE - Versão Asíncrona (SQLite3).
 * VERSÃO 3.2: Suporte a Migrações Automáticas Garantidas.
 */

const sqlite3 = require('@journeyapps/sqlcipher').verbose();
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let database: any = null;
let dbPronto = false;
let dbPromessa: Promise<any> | null = null;

/**
 * Fecha o banco e deleta o arquivo físico se solicitado
 */
export async function resetarBancoLocal() {
    if (database) {
        return new Promise<void>((resolve) => {
            database?.close((err: any) => {
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
export async function inicializarBanco(): Promise<any> {
    if (dbPromessa) return dbPromessa;

    dbPromessa = new Promise((resolve, reject) => {
        const dbDir = path.join(app.getPath('userData'), 'data');
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

        const dbPath = path.join(dbDir, 'catraki-agente-v3.db');

        const { config } = require('./config');
        const chaveMestra = config.agente_secret || 'catraki-secret-padrao';

        const inicializarComSeguranca = (tentativa = 1) => {
            const db = new sqlite3.Database(dbPath, (err: any) => {
                if (err) {
                    if (err.message.includes('is not a database') && tentativa === 1) {
                        try {
                            console.warn('[DB] 🚨 Arquivo incompatível detectado. Resetando banco para auto-correção...');
                            if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
                            return inicializarComSeguranca(2);
                        } catch (e) { return reject(err); }
                    }
                    return reject(err);
                }
            });

            db.serialize(() => {
                // ⚡ ATIVAÇÃO DA CRIPTOGRAFIA (SQLCipher)
                db.run(`PRAGMA key = '${chaveMestra}'`, (errKey: any) => {
                    // Testamos a chave com uma query simples
                    db.get(`SELECT count(*) FROM sqlite_master`, (errQuery: any) => {
                        if (errQuery && errQuery.message.includes('is not a database')) {
                            if (tentativa === 1) {
                                console.warn('[DB] 🔐 Banco sem senha detectado. Aplicando criptografia...');
                                db.run(`PRAGMA key = ''`, () => {
                                    db.run(`PRAGMA rekey = '${chaveMestra}'`, (errRekey: any) => {
                                        if (errRekey) {
                                            console.error('[DB] ❌ Falha na migração. Deletando arquivo para garantir boot...');
                                            db.close(() => {
                                                if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
                                                return inicializarComSeguranca(2);
                                            });
                                        }
                                    });
                                });
                            } else {
                                return reject(new Error('Falha crítica na inicialização do banco cifrado.'));
                            }
                        }
                    });
                });

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
                
                // 3. Tabela de Alunos
                db.run(`CREATE TABLE IF NOT EXISTS alunos_cache (
                    matricula TEXT NOT NULL, 
                    escola_id TEXT NOT NULL, 
                    nome_completo TEXT, 
                    turma_id TEXT, 
                    turno TEXT,
                    mensagem_aviso TEXT,
                    ativo INTEGER DEFAULT 1, 
                    atualizado_em DATETIME DEFAULT (datetime('now', 'localtime')), 
                    PRIMARY KEY (matricula, escola_id)
                )`);

                db.run(`ALTER TABLE alunos_cache ADD COLUMN turno TEXT`, () => {});
                db.run(`ALTER TABLE alunos_cache ADD COLUMN mensagem_aviso TEXT`, () => {});

                // 5. Tabela de Visitantes (Offline Guest Pass)
                db.run(`CREATE TABLE IF NOT EXISTS visitantes_offline (
                    id TEXT PRIMARY KEY,
                    nome TEXT NOT NULL,
                    documento TEXT,
                    motivo TEXT,
                    timestamp_entrada DATETIME DEFAULT (datetime('now', 'localtime')),
                    sincronizado INTEGER DEFAULT 0
                )`);

                // 4. Tabela de Turmas
                db.run(`CREATE TABLE IF NOT EXISTS turmas_cache (
                    id TEXT PRIMARY KEY,
                    turno TEXT,
                    atualizado_em DATETIME DEFAULT (datetime('now', 'localtime'))
                )`, () => {
                    db.run(`CREATE INDEX IF NOT EXISTS idx_alunos_matricula ON alunos_cache (matricula)`);
                    db.run(`CREATE INDEX IF NOT EXISTS idx_registros_sinc ON registros_acesso (sincronizado)`);

                    database = db;
                    dbPronto = true;
                    console.log('[DB] Base de dados operacional e cifrada.');
                    resolve(db);
                });
            });
        };

        inicializarComSeguranca();
    });

    return dbPromessa;
}

export function getDb(): any {
  if (!database) {
      const dbDir = path.join(app.getPath('userData'), 'data');
      const dbPath = path.join(dbDir, 'catraki-agente-v3.db');
      
      try {
          database = new sqlite3.Database(dbPath);
          const { config } = require('./config');
          const chaveMestra = config.agente_secret || 'catraki-secret-padrao';
          database.run(`PRAGMA key = '${chaveMestra}'`);
      } catch (e) {
          console.error('[DB] Erro fatal no fallback do banco. Tentando boot via inicializarBanco...');
      }
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
