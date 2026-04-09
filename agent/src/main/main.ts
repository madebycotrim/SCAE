/**
 * agent/src/main/main.ts
 * Servidor de Recebimento de Eventos em Tempo Real (Push).
 * Gerenciador de Janela e Handlers de Comunicação (IPC).
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import http from 'http';
import { obterLeitoresAtivos, recarregarLeitores, recarregarLeitorEspecifico, iniciarPolling } from '../services/poller';
import { carregarConfiguracaoHardware, salvarLeitoresNoDisco, config } from '../infra/config';
import { stats } from '../infra/stats';
import { iniciarSync, obterContagemPendentes } from '../services/sync';
import { resetarBancoLocal } from '../infra/db';

// ── REDIRECIONAMENTO DE LOGS (Agente -> UI) ──
const originalLogs = {
    log: console.log,
    warn: console.warn,
    error: console.error
};

function formatarLog(args: any[]) {
    return args.map(arg => {
        if (typeof arg === 'object') {
            try { return JSON.stringify(arg); } catch { return String(arg); }
        }
        return String(arg);
    }).join(' ');
}

console.log = (...args) => {
    originalLogs.log(...args);
    if (mainWindow) mainWindow.webContents.send('new-log', formatarLog(args));
};

console.warn = (...args) => {
    originalLogs.warn(...args);
    // Para simplificar no preload v1, enviamos apenas o texto. 
    // O index.html já tem lógica de colorizar tags.
    if (mainWindow) mainWindow.webContents.send('new-log', `[AVISO] ${formatarLog(args)}`);
};

console.error = (...args) => {
    originalLogs.error(...args);
    if (mainWindow) mainWindow.webContents.send('new-log', `[ERRO] ${formatarLog(args)}`);
};

let mainWindow: BrowserWindow | null = null;

/**
 * Notifica a UI que as configurações foram atualizadas pela nuvem.
 */
export function avisarMudancaConfig() {
    if (mainWindow) {
        mainWindow.webContents.send('config-updated', {
            nomeEscola: config.nome_escola,
            ttsAtivo: config.tts_ativado,
            ttsSucesso: config.tts_sucesso,
            ttsErro: config.tts_erro
        });
        // Força pulso de status imediato
        enviarStatusParaUI();
    }
}

/**
 * Envia o estado completo do Agente para a Interface (Renderer).
 * Essencial para o dashboard e listagem de equipamentos.
 */
function enviarStatusParaUI() {
    if (!mainWindow) return;

    obterContagemPendentes().then(pendentes => {
        if (!mainWindow) return;
        const leitores = obterLeitoresAtivos();
        // console.log(`[UI-Pulse] Enviando status: ${leitores.length} leitores ativos.`);

        mainWindow.webContents.send('hardware-status', {
            ok: true,
            agente: 'Catraki Edge Agent',
            versao: '2.0.0',
            nome_escola: config.nome_escola,
            total_alunos: config.total_alunos,
            tts_ativado: config.tts_ativado,
            tts_sucesso: config.tts_sucesso,
            tts_erro: config.tts_erro,
            ip_agente_config: config.ip_agente,
            pendentes,
            stats: stats.obterSnapshot(),
            leitores: leitores.map(l => ({
                id: l.id,
                nome: l.nome,
                tipo: l.tipo,
                online: (l as any).online !== undefined ? (l as any).online : 'verificando',
                ip: l.ip,
                porta: (l as any).porta || 80,
                totalUsuarios: (l as any).totalUsuarios || 0
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
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'Catraki Edge Agent - Hub de Portaria'
  });

  mainWindow.removeMenu();

  // Servidor para receber eventos do iDFlex via HTTP PUSH
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200); res.end(); return;
    }

    if (req.url === '/ping' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ok: true,
            agente: 'Catraki Edge Agent',
            versao: '2.0.0',
            nome_escola: config.nome_escola,
            total_alunos: config.total_alunos
        }));
        return;
    }

    if (req.url === '/sync-now' && req.method === 'POST') {
        const { forcarSincronizacaoImediata } = require('../services/sync');
        forcarSincronizacaoImediata().catch(() => {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    if (req.url === '/idflex-push' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
             try {
                const ev = JSON.parse(body);
                const clientIp = req.socket.remoteAddress?.replace('::ffff:', '').split(':')[0];
                
                const leitor = obterLeitoresAtivos().find((l: any) => {
                    const leitorBaseIp = l.ip.split(':')[0];
                    return leitorBaseIp === clientIp;
                }) as any;

                if (leitor && ev.event !== undefined) {
                    const idUsuario = ev.user_id || 0;

                    // --- TRAVA DE SEGURANÇA (DEBOUNCE) ---
                    const chaveDebounce = `${leitor.id}-${idUsuario}`;
                    const agora = Date.now();
                    if (idUsuario !== 0 && (global as any)[`debounce_${chaveDebounce}`] && (agora - (global as any)[`debounce_${chaveDebounce}`] < 5000)) {
                        res.writeHead(200); res.end();
                        return;
                    }
                    if (idUsuario !== 0) (global as any)[`debounce_${chaveDebounce}`] = agora;

                    // --- TRATAMENTO DOS DADOS DO USUÁRIO ---
                    let nomeParaExibir = 'ACESSO NÃO RECONHECIDO';
                    let matriculaParaExibir = '—';

                    if (idUsuario !== 0 && idUsuario !== '0') {
                        const info = leitor.obterDadosUsuarioHardware(String(idUsuario));
                        nomeParaExibir = info.nome;
                        matriculaParaExibir = info.matricula;
                    }

                    // --- CLASSIFICAÇÃO INTELIGENTE DE HORÁRIOS ---
                    const { runSql, getSql } = require('../infra/db');
                    const { classificarAcesso } = require('../services/classificador');

                    const aluno = (idUsuario !== 0 && idUsuario !== '0') 
                        ? await getSql('SELECT nome_completo, turma_id, turno, mensagem_aviso FROM alunos_cache WHERE matricula = ?', [matriculaParaExibir])
                        : null;
                    
                    const classificacao = classificarAcesso(matriculaParaExibir, aluno?.turno);
                    const statusAcesso = [6, 7, 10, 11, 12, 14, 15, 16, 31].includes(ev.event) ? classificacao.tipo : 'NEGADO';
                    const turmaAcesso = aluno?.turma_id || '---';
                    const detalheAcesso = classificacao.mensagem;

                    if (statusAcesso !== 'NEGADO') leitor.emitirBeep();
                    else (leitor.emitirBeepErro ? leitor.emitirBeepErro() : leitor.emitirBeep());

                    // --- PERSISTÊNCIA E NOTIFICAÇÃO ---
                    const idUnico = `PUSH-${leitor.id}-${ev.time}`;
                    try {
                        const agoraIso = new Date().toISOString();
                        await runSql(`
                            INSERT INTO registros_acesso (id, leitor_id, escola_id, matricula, nome, tipo, autorizado, timestamp_acesso, sincronizado)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                        `, [idUnico, leitor.id, config.escola_id, String(matriculaParaExibir), nomeParaExibir, statusAcesso, statusAcesso !== 'NEGADO' ? 1 : 0, agoraIso]);
                    } catch (e) { /* Silencioso se duplicado */ }

                    stats.registrarAcesso(nomeParaExibir, String(matriculaParaExibir), statusAcesso, turmaAcesso);

                    if (mainWindow) {
                        mainWindow.webContents.send('new-access', { 
                            nome: (idUsuario === 0) ? nomeParaExibir : `${nomeParaExibir} (${matriculaParaExibir})`, 
                            nomePuro: nomeParaExibir,
                            turma: turmaAcesso,
                            matricula: matriculaParaExibir,
                            sucesso: statusAcesso !== 'NEGADO',
                            statusAcesso,
                            detalhe: detalheAcesso,
                            mensagemAviso: aluno?.mensagem_aviso || null, // Recado personalizado
                            ttsAtivo: config.tts_ativado,
                            ttsParams: {
                                sucesso: config.tts_sucesso || 'Bem-vindo, {nome}!',
                                erro: config.tts_erro || 'Acesso negado, {nome}!'
                            }
                        });
                        // ⚡ ATUALIZAÇÃO IMEDIATA: Força sidebar e estatísticas a mudarem na hora
                        enviarStatusParaUI();
                    }
                 }
                 res.writeHead(200); res.end();
             } catch (e) { res.writeHead(500); res.end(); }
        });
    } else {
        res.writeHead(404); res.end();
    }
  });

  server.listen(1912, '0.0.0.0', () => {
      console.log(`[Local API] Servidor de Sincronização Ativo.`);
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Pulse regular de Status (5s) para manter a UI atualizada
  setInterval(enviarStatusParaUI, 5000);

  // --- HANDLERS IPC (UI para Agente) ---

  ipcMain.handle('verificar-pin', async (_event, { pin }) => {
    return { ok: pin === config.admin_pin };
  });

  ipcMain.handle('salvar-leitores', async (_event, { leitores, ipAgente }) => {
    try {
        console.log(`[Config] 💾 Recebida ordem de salvamento: ${leitores.length} dispositivos | IP Agente: ${ipAgente || 'Automático'}`);
        
        // Log individual para debugar
        leitores.forEach((l: any, i: number) => {
            console.log(`  [${i+1}] ID: ${l.id} | IP: ${l.ip} | Tipo: ${l.tipo}`);
        });

        const ok = salvarLeitoresNoDisco(leitores, ipAgente);
        if (ok) {
            carregarConfiguracaoHardware();
            recarregarLeitores();
            enviarStatusParaUI();
            console.log(`[Config] ✅ Configuração aplicada e persistida.`);
            return { ok: true };
        }
        return { ok: false };
    } catch (e: any) {
        console.error(`[Config] ❌ Falha crítica ao salvar configurações:`, e.message);
        return { ok: false, erro: e.message };
    }
  });
  ipcMain.handle('listar-alunos', async (_event, leitorId) => {
    try {
        const leitor = obterLeitoresAtivos().find(l => l.id === leitorId);
        if (!leitor) return { ok: false, erro: 'Leitor não encontrado ou offline.' };
        if (!leitor.listarAlunos) return [];
        return await leitor.listarAlunos();
    } catch { return []; }
  });

  ipcMain.handle('cadastrar-aluno', async (_event, dados) => {
    try {
        const leitor = obterLeitoresAtivos().find(l => l.id === dados.leitorId);
        if (!leitor) return { ok: false, erro: 'Leitor offline.' };
        return await leitor.cadastrarAluno(dados);
    } catch (e: any) {
        return { ok: false, erro: e.message };
    }
  });

  ipcMain.handle('iniciar-captura', async (_event, dados) => {
    try {
        const leitor = obterLeitoresAtivos().find(l => l.id === dados.leitorId);
        if (!leitor) return { ok: false, erro: 'Leitor offline.' };
        if (!leitor.iniciarCaptura) return { ok: false, erro: 'Hardware não suporta captura remota.' };
        return await leitor.iniciarCaptura(dados.userId);
    } catch (e: any) {
        return { ok: false, erro: e.message };
    }
  });

  ipcMain.handle('excluir-aluno', async (_event, { leitorId, matricula }) => {
    try {
        const leitor = obterLeitoresAtivos().find(l => l.id === leitorId);
        if (!leitor) return { ok: false, erro: 'Leitor offline.' };
        return await leitor.removerAluno(matricula);
    } catch (e: any) {
        return { ok: false, erro: e.message };
    }
  });

  ipcMain.handle('reconectar-leitor', async (_event, { leitorId }) => {
    try {
        const res = await recarregarLeitorEspecifico(leitorId);
        enviarStatusParaUI();
        return res;
    } catch (e: any) {
        return { ok: false, erro: e.message };
    }
  });

  ipcMain.handle('reset-db', async () => {
    try {
        await resetarBancoLocal();
        app.relaunch();
        app.quit();
        return { ok: true };
    } catch (e: any) {
        return { ok: false, erro: e.message };
    }
  });

  ipcMain.handle('backup-db', async () => {
    const userData = app.getPath('userData');
    const dbPath = path.join(userData, 'data', 'catraki-agente-v3.db');
    const backupPath = path.join(app.getPath('desktop'), `SCAE-BACKUP-${Date.now()}.db`);
    
    try {
        require('fs').copyFileSync(dbPath, backupPath);
        return { ok: true, path: backupPath };
    } catch (e: any) {
        return { ok: false, erro: e.message };
    }
  });



  // --- INICIALIZAÇÃO DO HARDWARE E MOTORES ---
  carregarConfiguracaoHardware();
  stats.sincronizarComBanco();
  recarregarLeitores();
  iniciarPolling(mainWindow);
  iniciarSync();

  // Envia primeiro pulso de status após o boot
  setTimeout(enviarStatusParaUI, 1500);

  // --- AUTO-UPDATE ---
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('update-available', () => {
    console.log('[AutoUpdate] 🔄 Nova versão disponível! Baixando...');
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('[AutoUpdate] ✅ Atualização baixada. Reiniciando em 5 segundos...');
    setTimeout(() => autoUpdater.quitAndInstall(), 5000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
