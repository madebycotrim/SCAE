import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

// Importações Dinâmicas (Para Eventos)
import { leitoresAtivos, iniciarPolling, recarregarLeitores } from '../services/poller';
import { iniciarSync, sincronizarCacheAlunos } from '../services/sync';
import { runSql, getSql } from '../infra/db';
import { config, salvarLeitoresNoDisco, carregarConfiguracaoHardware } from '../infra/config';
import { stats } from '../infra/stats';
import { buscarIpLocal } from '../utils/rede';

// --- LOG DE MANUTENÇÃO E INTEGRIDADE NO BOOT ---
console.log(`[Segurança] [${new Date().toISOString()}] Monitor de Integridade Iniciado. Ativando blindagem de rede...`);

let mainWindow: BrowserWindow | null = null;
let sistemaAtivado = false;

// Garante carregamento de IP no Radar
carregarConfiguracaoHardware();

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: 'SCAE - Agente de Biometria',
    icon: path.join(__dirname, 'CATRAKI.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
  });

  // --- SERVIDOR LOCAL PARA RECEBER PUSH DOS HARDWARES ---
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Security-PIN');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.url === '/ping') {
        const statsObj = {
            ok: true,
            agente: 'Catraki Edge Agent',
            versao: '1.6.2-FINAL', // Versão atualizada
            escola: config.nome_escola || config.escola_id, 
            status: sistemaAtivado ? 'ONLINE (TÚNEL ATIVO)' : 'STANDBY (SINAL RESTRITO)',
            stats: stats.obterSnapshot(),
            config: {
                tts: config.tts_ativado,
                frase_sucesso: config.tts_sucesso
            },
            leitores: leitoresAtivos.map(l => ({
                id: l.id,
                nome: l.nome,
                tipo: 'ID_FLEX',
                online: (l as any).online || false,
                ip: l.ip,
                porta: l.porta
            }))
        };
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(statsObj));
    } else if (req.url === '/sync-now' && req.method === 'POST') {
        try {
            await sincronizarCacheAlunos(true); // Força o Sync (Zera o Hash)
            res.writeHead(200); res.end(JSON.stringify({ ok: true }));
        } catch (e) {
            res.writeHead(500); res.end(JSON.stringify({ error: 'Erro no trigger de sync' }));
        }
    } else if (req.url === '/enroll' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
             try {
                const { aluno_id, leitor_id } = JSON.parse(body);
                const leitor = leitor_id 
                    ? leitoresAtivos.find(l => l.id === leitor_id)
                    : leitoresAtivos[0];

                if (leitor && (leitor as any).iniciarCaptura) {
                    console.log(`[Enroll] Captura para aluno ${aluno_id} no leitor ${leitor.id}`);
                    const ok = await (leitor as any).iniciarCaptura(parseInt(aluno_id, 10));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok, mensagem: ok ? 'Captura iniciada' : 'Erro' }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, mensagem: 'Hardware não disponível' }));
                }
             } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, erro: e.message || 'Falha na captura remota.' }));
             }
        });
    } else if (req.url?.startsWith('/idflex-push') && req.method === 'POST') {
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
                    // Evita que 1 toque gere múltiplos logs se o aluno segurar o dedo.
                    // Trava de 5 segundos por usuário por leitor.
                    const chaveDebounce = `${leitor.id}-${idUsuario}`;
                    const agora = Date.now();
                    if (idUsuario !== 0 && (global as any)[`debounce_${chaveDebounce}`] && (agora - (global as any)[`debounce_${chaveDebounce}`] < 5000)) {
                        res.writeHead(200); res.end();
                        return;
                    }
                    if (idUsuario !== 0) (global as any)[`debounce_${chaveDebounce}`] = agora;


                    const statusAcesso = [6, 7, 10, 11, 12, 14, 15, 16, 31].includes(ev.event) ? 'ENTRADA' : 'NEGADO';
                    let nomeParaExibir = 'ACESSO NÃO RECONHECIDO';
                    let matriculaParaExibir = '—';

                    if (idUsuario !== 0 && idUsuario !== '0') {
                        const info = leitor.obterDadosUsuarioHardware(String(idUsuario));
                        nomeParaExibir = info.nome;
                        matriculaParaExibir = info.matricula;
                    }

                    if (statusAcesso === 'ENTRADA') leitor.emitirBeep();
                    else (leitor.emitirBeepErro ? leitor.emitirBeepErro() : leitor.emitirBeep());

                    const { getSql } = require('../infra/db');
                    const aluno = (idUsuario !== 0 && idUsuario !== '0') 
                        ? await getSql('SELECT turma_id FROM alunos_cache WHERE matricula = ?', [matriculaParaExibir])
                        : null;
                    const turmaAcesso = aluno?.turma_id || '---';

                    if (mainWindow) {
                        mainWindow.webContents.send('new-access', { 
                            nome: (idUsuario === 0) ? nomeParaExibir : `${nomeParaExibir} (${matriculaParaExibir})`, 
                            nomePuro: nomeParaExibir,
                            turma: turmaAcesso,
                            matricula: matriculaParaExibir,
                            sucesso: statusAcesso === 'ENTRADA',
                            ttsAtivo: config.tts_ativado,
                            ttsParams: {
                                sucesso: config.tts_sucesso ?? 'Bem-vindo, {nome}!',
                                erro: config.tts_erro ?? 'Acesso negado, {nome}!'
                            }
                        });
                    }

                    // --- PERSISTÊNCIA: Salva no banco local para o Sync enviar para a nuvem ---
                    const { runSql } = require('../infra/db');
                    const uuid = require('crypto').randomUUID();
                    runSql(`
                        INSERT INTO registros_acesso (id, leitor_id, escola_id, matricula, nome, tipo, autorizado, timestamp_acesso)
                        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
                    `, [uuid, leitor.id, config.escola_id, matriculaParaExibir, nomeParaExibir, statusAcesso, 1]);

                    stats.registrarAcesso(nomeParaExibir, matriculaParaExibir, statusAcesso, turmaAcesso);
                }
             } catch (e) { console.error('[Push] Erro:', e); }
             res.writeHead(200); res.end();
        });
    } else if (req.url === '/reset-db' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
             try {
                const { confirmacao } = JSON.parse(body);
                if (confirmacao !== 'RESETAR-BANCO-CATRAKI-DF') {
                    res.writeHead(403); res.end(JSON.stringify({ ok: false, erro: 'Confirmação Semântica Inválida.' }));
                    return;
                }

                const { resetarBancoLocal } = require('../infra/db');
                await resetarBancoLocal();
                setTimeout(() => { app.relaunch(); app.exit(0); }, 500);
                res.writeHead(200); res.end(JSON.stringify({ ok: true }));
             } catch (e) { res.writeHead(500); res.end(JSON.stringify({ ok: false })); }
        });
    } else if (req.url?.startsWith('/biometria/status')) {
        // --- CONSULTA STATUS BIOMÉTRICO (MODAL ALUNOS) ---
        try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const matricula = urlObj.searchParams.get('matricula');
            
            if (!matricula) {
                res.writeHead(400); res.end(JSON.stringify({ ok: false, erro: 'Matrícula necessária' }));
                return;
            }

            // Busca em todos os leitores se este cara tem biometria
            let cadastrado = false;
            for (const leitor of leitoresAtivos) {
                if ((leitor as any).obterMapaBiometriaHardware) {
                    const mapa = await (leitor as any).obterMapaBiometriaHardware();
                    // Converte matricula para ID numerico como o driver faz no cadastro
                    const matriculaNumerica = parseInt(matricula.replace(/\D/g, ''), 10);
                    if (mapa.has(matriculaNumerica)) {
                        cadastrado = true;
                        break;
                    }
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, cadastrado }));
        } catch (e) {
            res.writeHead(500); res.end(JSON.stringify({ ok: false }));
        }
    } else if (req.url === '/reset-stats') {
        // --- LIMPA ESTATÍSTICAS EM MEMÓRIA ---
        try {
            stats.limparEstatisticas();
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ ok: true }));
        } catch (e: any) {
            res.writeHead(500); res.end(JSON.stringify({ ok: false, erro: e.message }));
        }
    }
  });

  server.listen(1912, '0.0.0.0', () => {
      console.log(`[Local API] Servidor ativo em http://0.0.0.0:1912`);
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  ipcMain.handle('salvar-leitores', async (_event, { leitores, ipAgente }) => {
    try {
        console.warn(`[Agente] Salvando ${leitores.length} leitores e IP do Agente (${ipAgente || 'Automático'})...`);
        const ok = salvarLeitoresNoDisco(leitores, ipAgente);
        if (ok) {
            carregarConfiguracaoHardware();
            await stats.sincronizarComBanco(); // ITEM: Faz o gráfico de hora funcionar no boot
            await recarregarLeitores(); // Agora o recarregar verá a config atualizada no disco
            return { ok: true };
        }
        return { ok: false, erro: 'Falha durante escrita de arquivo' };
    } catch (e: any) {
        console.error('[Agente] Falha ao salvar hardware:', e.message);
        return { ok: false, erro: e.message };
    }
  });

  ipcMain.handle('listar-alunos', async (_event, leitorId) => {
    const leitor = leitoresAtivos.find(l => l.id === leitorId);
    if (leitor && (leitor as any).listarAlunos) return await (leitor as any).listarAlunos();
    return [];
  });
  
  ipcMain.handle('reconectar-leitor', async (_event, { leitorId }) => {
    const { recarregarLeitorEspecifico } = require('../services/poller');
    return await recarregarLeitorEspecifico(leitorId);
  });

  ipcMain.handle('reset-db', async () => {
    const { resetarBancoLocal } = require('../infra/db');
    await resetarBancoLocal();
    setTimeout(() => { app.relaunch(); app.exit(0); }, 500);
    return { ok: true };
  });

  ipcMain.handle('verificar-pin', async (_event, { pin }) => {
    return { ok: pin === config.admin_pin };
  });

  ipcMain.handle('backup-db', async () => {
    try {
        const dbDir = path.join(app.getPath('userData'), 'data');
        const dbPath = path.join(dbDir, 'catraki-agente-v3.db');

        if (!fs.existsSync(dbPath)) return { ok: false, erro: 'Banco não encontrado' };

        const { filePath } = await dialog.showSaveDialog({
            title: 'Salvar Cópia do Banco de Dados',
            defaultPath: path.join(app.getPath('desktop'), `backup-catraki-${new Date().toISOString().slice(0, 10)}.db`),
            filters: [{ name: 'SQLite Database', extensions: ['db'] }]
        });

        if (filePath) {
            fs.copyFileSync(dbPath, filePath);
            return { ok: true, path: filePath };
        }
        return { ok: false };
    } catch (e: any) {
        return { ok: false, erro: e.message };
    }
  });
}

app.whenReady().then(async () => {
    console.log('[Agente] Aplicação Electron pronta!');
    await stats.sincronizarComBanco(); // ITEM: Faz o gráfico de hora funcionar no boot
    await createWindow();
    
    /**
     * Ciclo de Ativação Inteligente: Só liga o Sync e o Polling Real
     * se houver pelo menos um equipamento respondendo.
     */
    const tentarAtivacaoSistemas = async () => {
      if (sistemaAtivado) return;

      const temAlguemOnline = leitoresAtivos.some(l => (l as any).online === true);
      
      if (temAlguemOnline) {
        console.log('[Agente] 🟢 HARDWARE ONLINE! Ativando motores do sistema...');
        sistemaAtivado = true;
        
        iniciarPolling(mainWindow);
        await iniciarSync();

        console.log('[Agente] Sistema totalmente operacional ✓');
      } else {
        console.log('[Agente] ⏳ Standby: Aguardando sinal de vida dos equipamentos...');
      }
    };
  
    try {
      enviarStatusHardware();
      
      const { limparRegistrosAntigos } = require('../infra/db');
      limparRegistrosAntigos(); // Roda 1 vez no boot
      setInterval(limparRegistrosAntigos, 12 * 60 * 60 * 1000); // Roda a cada 12h
      setInterval(() => stats.sincronizarComBanco(), 30 * 60 * 1000); // Recalcula a janela 24h a cada 30min

      setInterval(tentarAtivacaoSistemas, 5000);
      setTimeout(tentarAtivacaoSistemas, 1500);
  
    } catch (e: any) {
      console.error('[Agent] Erro na inicialização:', e.message);
    }

  // Logs Visuais
  const originalLog = console.log;
  console.log = (...args) => {
      originalLog(...args);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('new-log', args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
      }
  };
});

async function enviarStatusHardware() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents.send('hardware-status', {
    nome_escola: config.nome_escola,
    total_alunos: config.total_alunos || 0,
    tts_ativado: config.tts_ativado,
    tts_sucesso: config.tts_sucesso,
    tts_erro: config.tts_erro,
    stats: stats.obterSnapshot(),
    ip_agente_config: config.ip_agente,
    leitores: leitoresAtivos.map(l => ({
      id: l.id, nome: l.nome, ip: l.ip, porta: l.porta,
      online: (l as any).online || false, 
      totalUsuarios: (l as any).totalUsuarios || 0
    }))
  });
}

setInterval(enviarStatusHardware, 10000);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- API PARA O SERVIÇO DE SYNC ---
export function avisarMudancaConfig() {
    if (!mainWindow) return;
    
    mainWindow.webContents.send('hardware-status', {
        ok: true,
        nome_escola: config.nome_escola,
        total_alunos: config.total_alunos,
        tts_ativado: config.tts_ativado,
        tts_sucesso: config.tts_sucesso,
        tts_erro: config.tts_erro,
        stats: stats.obterSnapshot(),
        ip_agente_config: config.ip_agente,
        leitores: leitoresAtivos.map(l => ({
            id: l.id,
            nome: l.nome,
            online: (l as any).online || false,
            ip: l.ip,
            porta: l.porta || 80
        }))
    });
}
