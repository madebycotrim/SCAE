/**
 * agent/src/main/main.ts
 * Servidor de Recebimento de Eventos em Tempo Real (Push).
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import http from 'http';
import { leitoresAtivos, recarregarLeitores } from '../services/poller';
import { carregarConfiguracaoHardware, salvarLeitoresNoDisco, config } from '../infra/config';
import { stats } from '../infra/stats';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'Catraki Edge Agent - Hub de Portaria'
  });

  // Servidor para receber eventos do iDFlex via HTTP PUSH
  const server = http.createServer((req, res) => {
    // Adiciona CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200); res.end(); return;
    }

    if (req.url === '/idflex-push' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
             try {
                const ev = JSON.parse(body);
                const clientIp = req.socket.remoteAddress?.replace('::ffff:', '').split(':')[0];
                
                const leitor = leitoresAtivos.find(l => {
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
                    const { getSql, runSql } = require('../infra/db');
                    const { classificarAcesso } = require('../services/classificador');

                    const aluno = (idUsuario !== 0 && idUsuario !== '0') 
                        ? await getSql('SELECT nome_completo, turma_id, turno FROM alunos_cache WHERE matricula = ?', [matriculaParaExibir])
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
                        await runSql(`
                            INSERT INTO registros_acesso (id, leitor_id, escola_id, matricula, nome, tipo, autorizado, sincronizado)
                            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                        `, [idUnico, leitor.id, config.escola_id, String(matriculaParaExibir), nomeParaExibir, statusAcesso, statusAcesso !== 'NEGADO' ? 1 : 0]);
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
                            ttsAtivo: config.tts_ativado,
                            ttsParams: {
                                sucesso: config.tts_sucesso || 'Bem-vindo, {nome}!',
                                erro: config.tts_erro || 'Acesso negado, {nome}!'
                            }
                        });
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
      console.log(`[Local API] Servidor ativo em http://0.0.0.0:1912`);
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  ipcMain.handle('salvar-leitores', async (_event, { leitores, ipAgente }) => {
    try {
        const ok = salvarLeitoresNoDisco(leitores, ipAgente);
        if (ok) {
            carregarConfiguracaoHardware();
            await stats.sincronizarComBanco();
            await recarregarLeitores();
            return { ok: true };
        }
        return { ok: false };
    } catch (e: any) {
        return { ok: false, erro: e.message };
    }
  });

  // ... rest of the handlers
}

app.whenReady().then(createWindow);
