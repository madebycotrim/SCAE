import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as path from 'path';

async function check() {
    const dbPath = path.join(process.cwd(), 'agent', 'database.sqlite');
    console.log('Checking Agent DB at:', dbPath);

    try {
        const db = await open({ filename: dbPath, driver: sqlite3.Database });
        
        console.log('--- TABLES ---');
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table';");
        console.log(tables);

        console.log('--- CONFIGS ---');
        const configs = await db.all("SELECT * FROM configuracoes_unidade;");
        console.log(configs);

        await db.close();
    } catch (e) {
        console.error('Error opening Agent DB:', e);
    }
}

check();
