import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import http from 'http';
import { obterLeitoresAtivos, recarregarLeitores, recarregarLeitorEspecifico, iniciarPolling } from '../services/poller';
import { carregarConfiguracaoHardware, salvarLeitoresNoDisco, config } from '../infra/config';
import { stats } from '../infra/stats';
import { iniciarSync, obterContagemPendentes, sincronizarRegistrosPendentes } from '../services/sync';
import { resetarBancoLocal } from '../infra/db';

// 🛡️ REDE DE SEGURANÇA: Captura erros fatais e evita que o Agente feche sem aviso
process.on('uncaughtException', (erro) => {
    console.error(' [CRASH] Erro não capturado:', erro);
});
process.on('unhandledRejection', (motivo) => {
    console.error(' [CRASH] Promessa rejeitada sem tratamento:', motivo);
});

let mainWindow: BrowserWindow | null = null;

function formatarLog(args: any[]) {
    return args.map(arg => {
        if (typeof arg === 'object') {
            try { return JSON.stringify(arg); } catch { return String(arg); }
        }
        return String(arg);
    }).join(' ');
}

// Redirecionamento de logs
const originalLogs = { log: console.log, warn: console.warn, error: console.error };
console.log = (...args) => {
    originalLogs.log(...args);
    if (mainWindow) mainWindow.webContents.send('new-log', formatarLog(args));
};
console.warn = (...args) => {
    originalLogs.warn(...args);
    if (mainWindow) mainWindow.webContents.send('new-log', `[AVISO] ${formatarLog(args)}`);
};
console.error = (...args) => {
    originalLogs.error(...args);
    if (mainWindow) mainWindow.webContents.send('new-log', `[ERRO] ${formatarLog(args)}`);
};

function enviarStatusParaUI() {
    if (!mainWindow) return;
    obterContagemPendentes().then(pendentes => {
        if (!mainWindow) return;
        const leitores = obterLeitoresAtivos();
        mainWindow.webContents.send('hardware-status', {
            ok: true,
            agente: 'Catraki Edge Agent',
            versao: '2.0.0',
            nome_escola: config.nome_escola,
            total_alunos: config.total_alunos,
            tts_ativado: config.tts_ativado,
            stats: stats.obterSnapshot(),
            leitores: leitores.map(l => ({
                id: l.id,
                nome: l.nome,
                online: (l as any).online !== undefined ? (l as any).online : 'verificando',
                ip: l.ip
            }))
        });
    });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Catraki Edge Agent'
  });

  mainWindow.setMenuBarVisibility(false);

  const server = http.createServer(async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200); res.end(); return;
        }

        if (req.url === '/sync-now') {
            const { iniciarSync } = require('../services/sync');
            iniciarSync(true); // Força sincronização imediata
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, mensagem: 'Sincronização disparada manualmente.' }));
            return;
        }

        if (req.url === '/hardware/reiniciar') {
            const { rebootFisicoGeral, recarregarLeitores } = require('../services/poller');
            rebootFisicoGeral();
            recarregarLeitores(); 
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, mensagem: 'Hardware físico reiniciado com sucesso.' }));
            return;
        }

        if (req.url === '/ping') {
            const leitores = obterLeitoresAtivos();
            const leitoresOnline = leitores.filter(l => (l as any).online !== false).length;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                ok: true, 
                agente: 'Catraki Edge Agent',
                versao: '2.0.0',
                nome_escola: config.nome_escola,
                leitoresAtivos: leitoresOnline,
                stats: stats.obterSnapshot(),
                leitores: leitores.map(l => ({
                    id: l.id,
                    nome: l.nome,
                    online: (l as any).online !== undefined ? (l as any).online : 'verificando',
                    ip: l.ip,
                    totalUsuarios: (l as any).totalUsuarios || 0
                }))
            }));
            return;
        }

        if (req.url?.startsWith('/biometria/status')) {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const matricula = url.searchParams.get('matricula');
            const leitores = obterLeitoresAtivos();
            const leitoresOnline = leitores.filter(l => (l as any).online !== false).length;
            let cadastrado = false;
            
            for (const leitor of leitores) {
                if ((leitor as any).verificarUsuarioCadastrado) {
                    if (await (leitor as any).verificarUsuarioCadastrado(matricula)) {
                        cadastrado = true;
                        break;
                    }
                }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, cadastrado, leitoresAtivos: leitoresOnline }));
            return;
        }

        if (req.url === '/enroll' && req.method === 'POST') {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const { aluno_id } = JSON.parse(Buffer.concat(chunks).toString());
            const leitor = obterLeitoresAtivos()[0];
            if (!leitor || !leitor.iniciarCaptura) {
                res.writeHead(400); res.end(JSON.stringify({ ok: false, erro: 'Hardware não suporta captura.' }));
                return;
            }
            const resultado = await leitor.iniciarCaptura(Number(aluno_id));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(resultado));
            return;
        }

        if (req.url === '/idflex-push' && req.method === 'POST') {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const ev = JSON.parse(Buffer.concat(chunks).toString());
            const clientIp = req.socket.remoteAddress?.replace('::ffff:', '').split(':')[0];
            const leitor = obterLeitoresAtivos().find((l: any) => l.ip.split(':')[0] === clientIp) as any;

            if (leitor && ev.event !== undefined) {
                const idUsuario = ev.user_id || 0;
                let nomeParaExibir = 'ACESSO NÃO RECONHECIDO';
                let matriculaParaExibir = '—';

                if (idUsuario !== 0 && idUsuario !== '0') {
                    const info = leitor.obterDadosUsuarioHardware(String(idUsuario));
                    nomeParaExibir = info.nome;
                    matriculaParaExibir = info.matricula;
                }

                const { runSql, getSql } = require('../infra/db');
                const { classificarAcesso } = require('../services/classificador');

                const aluno = (idUsuario !== 0 && idUsuario !== '0') 
                    ? await getSql('SELECT nome_completo, turma_id, turno FROM alunos_cache WHERE matricula = ?', [matriculaParaExibir])
                    : null;
                
                const classificacao = classificarAcesso(matriculaParaExibir, aluno?.turno);
                const statusAcesso = [6, 7, 10, 11, 12, 14, 15, 16, 31].includes(ev.event) ? classificacao.tipo : 'NEGADO';
                const turmaAcesso = aluno?.turma_id || '---';

                if (statusAcesso !== 'NEGADO') leitor.emitirBeep();

                const agoraIso = new Date().toISOString();
                await runSql(`
                    INSERT INTO registros_acesso (id, leitor_id, escola_id, matricula, nome, tipo, autorizado, timestamp_acesso, sincronizado)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                `, [`PUSH-${leitor.id}-${ev.time}`, leitor.id, config.escola_id, String(matriculaParaExibir), nomeParaExibir, statusAcesso, statusAcesso !== 'NEGADO' ? 1 : 0, agoraIso]);

                stats.registrarAcesso(nomeParaExibir, String(matriculaParaExibir), statusAcesso, turmaAcesso);

                if (mainWindow) {
                    mainWindow.webContents.send('new-access', { 
                        nome: `${nomeParaExibir} (${matriculaParaExibir})`, 
                        turma: turmaAcesso,
                        sucesso: statusAcesso !== 'NEGADO'
                    });
                    enviarStatusParaUI();
                    
                    // 🚀 GATILHO TEMPO REAL: Tenta empurrar para a nuvem IMEDIATAMENTE após receber o push
                    sincronizarRegistrosPendentes().catch(() => {});
                }
            }
            res.writeHead(200); res.end();
            return;
        }

        res.writeHead(404); res.end();
    } catch (e: any) {
        console.error(`[Servidor Local] Erro:`, e.message);
        if (!res.writableEnded) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, erro: e.message }));
        }
    }
  });

  server.listen(1912, '0.0.0.0', () => {
      console.log(`[Local API] Servidor Ativo na porta 1912.`);
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // 🚀 ATIVAÇÃO DOS MOTORES CATRAKI
  iniciarSync();             // Inicia conversa com a Nuvem
  iniciarPolling(mainWindow); // Inicia radar de Hardware (Leitores)

  setInterval(enviarStatusParaUI, 5000);

  // Handlers IPC
  ipcMain.handle('verificar-pin', async (_event, { pin }) => ({ ok: pin === config.admin_pin }));
  ipcMain.handle('salvar-leitores', async (_event, { leitores, ipAgente }) => {
      if (salvarLeitoresNoDisco(leitores, ipAgente)) {
          carregarConfiguracaoHardware();
          recarregarLeitores();
          enviarStatusParaUI();
          return { ok: true };
      }
      return { ok: false };
  });

  autoUpdater.checkForUpdatesAndNotify();
  mainWindow.on('closed', () => { mainWindow = null; });
}

/**
 * 📢 NOTIFICADOR GLOBAL: Avisa a interface e os drivers que algo mudou (Cloud -> Local)
 */
export function avisarMudancaConfig() {
    if (mainWindow) {
        mainWindow.webContents.send('config-updated', { timestamp: new Date().toISOString() });
        enviarStatusParaUI();
    }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
