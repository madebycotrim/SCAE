require('dotenv').config();
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
            tts_sucesso: config.tts_sucesso,
            tts_erro: config.tts_erro,
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

<<<<<<< HEAD
        // 🛡️ SEGURANÇA: Bloqueia ações críticas sem o PIN administrativo
        const rotasCriticas = ['/sync-now', '/hardware/reiniciar', '/enroll', '/acesso/recentes'];
        const urlPura = req.url?.split('?')[0];
        
        if (rotasCriticas.includes(urlPura || '')) {
            const pinEnviado = req.headers['x-admin-pin'];
            if (pinEnviado !== config.admin_pin) {
                console.warn(`[Segurança] 🔒 Tentativa de acesso não autorizado à rota ${urlPura} de ${req.socket.remoteAddress}`);
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, erro: 'Acesso Negado: PIN Administrativo obrigatório.' }));
                return;
            }
        }

=======
>>>>>>> 1ce918e3c7ccce3f17306bf481729ae201d0e03c
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

        if (req.url?.startsWith('/acesso/recentes')) {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const desde = urlObj.searchParams.get('desde');
            
            // Log de diagnóstico para confirmar comunicação com o Dashboard
            // console.log(`[Agente] 🛰️ Dashboard solicitando logs recentes... desde: ${desde || 'inicio'}`);
            
            const { allSql } = require('../infra/db');
            
            let query = `
                SELECT id, leitor_id, matricula as aluno_matricula, nome as aluno_nome, 
                tipo as tipo_movimentacao, autorizado, timestamp_acesso
                FROM registros_acesso 
            `;
            
            const params: any[] = [];
            if (desde && desde !== 'undefined') {
                query += ` WHERE timestamp_acesso > ? `;
                params.push(desde);
            }
            
            query += ` ORDER BY timestamp_acesso DESC LIMIT 30 `;
            
            const registros = await allSql(query, params);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(registros));
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
                const idUsuario = ev.user_id !== undefined ? String(ev.user_id) : '0';
                console.log(`[Agente] 📟 Push Recebido de ${leitor.nome} [IP ${leitor.ip}]: Evento ${ev.event}, Usuário ${idUsuario}`);
                
                let nomeParaExibir = 'ACESSO NÃO RECONHECIDO';
                let matriculaParaExibir = '—';

                if (idUsuario !== '0' && idUsuario !== '') {
                    const info = leitor.obterDadosUsuarioHardware(String(idUsuario));
                    nomeParaExibir = info.nome;
                    matriculaParaExibir = info.matricula;
                }

                const { runSql, getSql } = require('../infra/db');
                const { classificarAcesso } = require('../services/classificador');

                const aluno = (idUsuario !== '0' && idUsuario !== '') 
                    ? await getSql('SELECT nome_completo, turma_id, turno, mensagem_aviso FROM alunos_cache WHERE matricula = ?', [matriculaParaExibir])
                    : null;
                
                const classificacao = classificarAcesso(matriculaParaExibir, aluno?.turno);
                const statusAcesso = [6, 7, 10, 11, 12, 14, 15, 16, 31].includes(ev.event) ? classificacao.tipo : 'NEGADO';
                const turmaAcesso = aluno?.turma_id || '---';

                if (statusAcesso !== 'NEGADO') leitor.emitirBeep();

                const agoraIso = new Date().toISOString();
                
                // ⚡ ANTI-DUPLICIDADE: Gera um ID fixo baseado no ID do evento do hardware
                // Se o hardware não enviou ID (raro), usa o timestamp + matricula como fallback
                const idEventoHardware = ev.id || `${agoraIso}-${matriculaParaExibir}`;
                const idRegistro = `${leitor.id}-${idEventoHardware}`;

                try {
                    await runSql(`
                        INSERT INTO registros_acesso (id, leitor_id, escola_id, matricula, nome, tipo, autorizado, timestamp_acesso, sincronizado)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                    `, [idRegistro, leitor.id, config.escola_id, String(matriculaParaExibir), nomeParaExibir, statusAcesso, statusAcesso !== 'NEGADO' ? 1 : 0, agoraIso]);
                } catch (e: any) {
                    if (e.message.includes('UNIQUE')) {
                        // console.log(`[Agente] Registro duplicado ignorado: ${idRegistro}`);
                        res.writeHead(200); res.end(); return;
                    }
                    throw e;
                }

                stats.registrarAcesso(nomeParaExibir, String(matriculaParaExibir), statusAcesso, turmaAcesso);

                if (mainWindow) {
                    mainWindow.webContents.send('new-access', { 
                        nome: `${nomeParaExibir} (${matriculaParaExibir})`, 
                        nomePuro: nomeParaExibir,
                        turma: turmaAcesso,
                        sucesso: statusAcesso !== 'NEGADO',
                        mensagemAviso: aluno?.mensagem_aviso || null,
                        ttsAtivo: config.tts_ativado,
                        ttsParams: {
                            sucesso: config.tts_sucesso,
                            erro: config.tts_erro
                        }
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

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`[Agente] ❌ ERRO: Porta 1912 já está em uso!`);
    } else {
        console.error(`[Agente] ❌ ERRO CRÍTICO NO SERVIDOR:`, e.message);
    }
});

server.listen(config.porta_agente || 1912, '0.0.0.0', () => {
    console.log(`[Agente] 🌐 API LOCAL ATIVA: http://localhost:${config.porta_agente || 1912}`);
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
