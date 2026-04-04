const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'catraki-agent', 'data', 'scae-agent-v2.db');
console.log('Abrindo banco em:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco:', err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    db.run('DELETE FROM registros_acesso WHERE sincronizado = 0', function(err) {
        if (err) {
            console.error('Erro ao deletar registros:', err.message);
        } else {
            console.log(`Sucesso: ${this.changes} registros de lixo removidos.`);
        }
    });

    // Resetar cursores de leitura se também quiser
    // db.run('DELETE FROM cursores_leitura');
    // console.log('Cursores de leitura resetados.');
});

db.close();
