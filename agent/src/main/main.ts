/**
 * main/main.ts
 * Processo Principal do Electron - Agente Local Catraki v1.5
 * Hardware Real <-> Dashboard em Tempo Real
 */

import { app, BrowserWindow, nativeImage, ipcMain } from 'electron';
import path from 'path';
import { iniciarPolling, leitoresAtivos, recarregarLeitores } from '../services/poller';
import { iniciarSync } from '../services/sync';
import { NotificadorVoz } from '../services/notificador-voz';
import { config, salvarLeitoresNoDisco } from '../infra/config';
import { TipoLeitor } from '../drivers/ILeitor';
import { WorkerApi } from '../services/worker-endpoint';
import { stats } from '../infra/stats';
import http from 'http';
import { buscarIpLocal } from '../utils/rede';
import { runSql } from '../infra/db';

// --- Servidor de Descoberta Local ---
// Permite que o Dashboard Web saiba se este agente está rodando nesta máquina.
const LOCAL_SERVER_PORT = 1912; // Porta fixa para descoberta
const iniciarServidorDescoberta = () => {
  const server = http.createServer((req, res) => {
    // Enable CORS para o sistema web
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    if (req.url === '/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      
      // Coletar status dos leitores (Reduzido para o dashboard web - Sem IP/Porta)
      const leitores = leitoresAtivos.map(l => {
        return {
          id: l.id,
          nome: l.nome,
          tipo: l.tipo,
          online: true, 
        };
      });

      res.end(JSON.stringify({ 
        ok: true, 
        agente: 'Catraki Edge Agent', 
        versao: '1.6.0',
        escola: config.escola_id,
        status: 'RUNNING',
        stats: stats.obterSnapshot(),
        leitores
      }));
    } else if (req.url === '/enroll' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { aluno_id } = JSON.parse(body);
                const leitor = leitoresAtivos.find(l => (l as any).iniciarCaptura);
                if (!leitor) throw new Error('Hardware biométrico não encontrado.');
                
                // Enroll no iDFlex via driver
                const ok = await (leitor as any).iniciarCaptura(parseInt(aluno_id, 10));
                
                if (ok) {
                    // Notifica a nuvem que a digital foi cadastrada com sucesso
                    await WorkerApi.confirmarBiometria(aluno_id);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok }));
            } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, mensagem: e.message }));
            }
        });
    } else if (req.url?.startsWith('/idflex-push') && req.method === 'POST') {
        // --- ENDPOINT DE PUSH (REAL-TIME) DO IDFLEX ---
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
             try {
                const ev = JSON.parse(body); // event_type, user_id, time, device_id, etc.
                const clientIp = req.socket.remoteAddress?.replace('::ffff:', '');
                const leitor = leitoresAtivos.find(l => l.ip === clientIp) as any;

                if (leitor && ev.user_id) {
                    // 1. Busca dados amigáveis no cache do driver
                    let info = leitor.obterDadosUsuarioHardware(String(ev.user_id));
                    
                    // Se o aluno for desconhecido (ex: acabou de ser cadastrado), força atualização do cache
                    if (info.nome.includes('DESCONHECIDO') || info.nome.includes('ACESSO NÃO RECONHECIDO')) {
                        try {
                            await leitor.sincronizarCacheNomesHardware(true);
                            info = leitor.obterDadosUsuarioHardware(String(ev.user_id));
                        } catch {}
                    }
                    
                    // 2. Feedback Físico (Beep e Mensagem)
                    const statusAcesso = [7, 10, 11, 12, 15].includes(ev.event) ? 'ENTRADA' : 'NEGADO';
                    if (statusAcesso === 'ENTRADA') {
                        leitor.emitirBeep();
                        leitor.exibirMensagemHardware(`BEM VINDO\n${info.nome.split(' ')[0]}`);
                    }

                    // 3. Registrar nos Stats para o Dashboard Web ver na hora
                    stats.registrarAcesso(info.nome, info.matricula, statusAcesso);
                }
             } catch (e) { console.error('[Push] Erro ao processar evento:', e); }
             
             res.writeHead(200); res.end();
        });
    } else if (req.url === '/sync-one' && req.method === 'POST') {
        // --- SINCRONIZAÇÃO IMEDIATA DE NOVO ALUNO ---
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
             try {
                const { matricula, nome } = JSON.parse(body);
                console.log(`[Agente] Sincronização imediata recebida: ${nome} (${matricula})`);
                
                // 1. Salvar no Cache Local (SQLite)
                await runSql(
                    `INSERT OR REPLACE INTO alunos_cache (matricula, nome, escola_id, ativo) VALUES (?, ?, ?, 1)`,
                    [matricula, nome, config.escola_id]
                );

                // 2. Tentar cadastrar em todos os leitores biométricos ativos
                for (const leitor of leitoresAtivos) {
                    if ((leitor as any).cadastrarAluno) {
                        try {
                            console.log(`[Agente][${leitor.id}] Cadastrando ${nome} no hardware...`);
                            await (leitor as any).cadastrarAluno({ matricula, nomeCompleto: nome });
                        } catch (err: any) {
                            console.warn(`[Agente][${leitor.id}] Falha no cadastro imediato: ${err.message}`);
                        }
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
             } catch (e: any) {
                res.writeHead(500); res.end(e.message);
             }
        });
    } else if (req.url === '/delete-user' && req.method === 'POST') {
        // --- EXCLUSÃO IMEDIATA VIA COMANDO DASHBOARD ---
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
             try {
                const { matricula } = JSON.parse(body);
                console.log(`[Agente] Comando de exclusão imediata recebido para matrícula: ${matricula}`);
                
                // 1. Remover dos Hardwares
                for (const leitor of leitoresAtivos) {
                    try { await leitor.removerAluno(matricula); } catch {}
                }

                // 2. Limpar do Cache Local do SQLite
                await runSql(`DELETE FROM alunos_cache WHERE matricula = ? AND escola_id = ?`, [matricula, config.escola_id]);
                
                console.log(`[Agente] Aluno ${matricula} removido com sucesso.`);
             } catch (e) {
                console.error('[Agente] Falha na exclusão imediata:', e);
             }
             res.writeHead(200); res.end();
        });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(LOCAL_SERVER_PORT, '0.0.0.0', () => {
    console.log(`[Local API] Servidor de descoberta ativo em http://0.0.0.0:${LOCAL_SERVER_PORT}`);
  });
};





let mainWindow: BrowserWindow | null = null;
let notificador: NotificadorVoz | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 850,
    resizable: true,
    maximizable: true,

    title: 'Catraki Edge Agent Control',
    icon: nativeImage.createEmpty(),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Broadcast de Status Real e Detalhado
  setInterval(async () => {
    if (mainWindow) {
      const statusLeitores = await Promise.all((config.leitores || []).map(async (conf: any) => {
        // Busca a instância ativa se existir
        const lAtivo = leitoresAtivos.find(l => 
          l.id === conf.id || 
          (l.ip === conf.ip && l.porta === conf.porta)
        );
        
        let isOnline = false;
        let pNome = conf.nome || conf.id;

        if (lAtivo) {
            try {
                isOnline = await lAtivo.ping();
                if (isOnline && (lAtivo as any).getNomeDispositivo) {
                    const n = await (lAtivo as any).getNomeDispositivo();
                    if (n) pNome = n;
                }
            } catch {}
        }

        return {
          id: conf.id || pNome,
          nome: pNome,
          ip: String(conf.ip || '').split(':')[0],
          porta: conf.porta || 80,
          tipo: conf.tipo || 'ID_FLEX',
          online: isOnline
        };
      }));

      mainWindow.webContents.send('hardware-status', {
        escola: config.escola_id,
        leitores: statusLeitores,
        sync: WorkerApi.online
      });
    }
  }, 5000);



  // Escutar configuração da UI (Seletor de Escola)
  ipcMain.handle('save-config', (_event, { escolaId, token, configHardware }) => {
    if (escolaId) {
        console.log(`[Config Web] Vinculando terminal à escola: ${escolaId}`);
        config.escola_id = escolaId;
    }
    if (token) config.agente_token = token;

    if (configHardware && Array.isArray(configHardware)) {
        console.log(`[Config Web] Persistindo ${configHardware.length} leitores localmente...`);
        salvarLeitoresNoDisco(configHardware);
        recarregarLeitores();

        // Tentar atualizar o nome no hardware físico (hostname) em background se estiverem online
        configHardware.forEach(conf => {
            const lAtivo = leitoresAtivos.find(l => l.id === conf.id);
            if (lAtivo && lAtivo.setNomeDispositivo && conf.nome) {
                lAtivo.setNomeDispositivo(conf.nome).catch(e => 
                    console.warn(`[Hardware][${conf.id}] Falha ao sincronizar Hostname: ${e.message}`)
                );
            }
        });
    }
    
    return { ok: true };
  });


  // Autenticação Digital via PIN (Eliminando erro de Rede/CORS no Browser)
  ipcMain.handle('login-pin', async (_event, pin) => {
    // 1. Fluxo Principal via Nuvem
    try {
      const url = `${config.endpoint_worker}/api/agente/login-pin`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      return await res.json();
    } catch (e: any) {
      console.warn('[Network] Falha na rede cloud:', e.message);
      
      // 2. Verificação de Backup/Admin Local (Acesso Offline de Emergência)
      if (pin === config.admin_pin) {
        console.log('[Auth] Acesso concedido via Senha Admin local (Fallback Offline).');
        return { 
          ok: true, 
          escola_id: config.escola_id, 
          escola_nome: 'ACESSANDO VIA ADMIN (OFFLINE)',
          token: config.agente_token,
          config_hardware: config.leitores 
        };
      }

      return { 
        ok: false, 
        mensagem: `Acesso à rede indisponível (${e.code || 'CLOUD_OFFLINE'}). Túnel possivelmente offline.` 
      };
    }
  });


  // --- Gestão de Usuários e Hardware Transferida para Nuvem ---

  ipcMain.handle('abrir-porta', async (_event, leitorId) => {
    const leitor = leitoresAtivos.find(l => l.id === leitorId);
    return leitor ? await leitor.abrirPorta() : false;
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

}

app.whenReady().then(async () => {
  iniciarServidorDescoberta();
  await createWindow();
  
  // Ativação automática do Modo Escola (Push Real-Time + Sync Hora) em todos os iDFlex
  setTimeout(async () => {
    const ipLocal = buscarIpLocal();
    if (ipLocal) {
        console.log(`[Agente] Iniciando ativação do modo Real-Time para IP local: ${ipLocal}`);
        for (const leitor of leitoresAtivos) {
            if ((leitor as any).configurarModoEscola) {
                (leitor as any).configurarModoEscola(ipLocal).catch((e: any) => 
                   console.warn(`[Hardware][${leitor.id}] Falha ao ativar Push: ${e.message}`)
                );
            }
        }
    }
  }, 8000); // Aguarda 8s para garantir que os hardwares e rede estejam estáveis

  // Interceptar logs do terminal para exibir na Janela Visual
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  function repassarAoLogVisual(msg: string) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('new-log', msg);
    }
  }

  function safeStringify(a: any) {
    if (a instanceof Error) return a.message || String(a);
    if (typeof a === 'object') return JSON.stringify(a);
    return a;
  }

  console.log = (...args) => {
      originalLog(...args);
      repassarAoLogVisual(args.map(safeStringify).join(' '));
  };
  console.warn = (...args) => {
      originalWarn(...args);
      repassarAoLogVisual('[Aviso] ' + args.map(safeStringify).join(' '));
  };
  console.error = (...args) => {
      originalError(...args);
      repassarAoLogVisual('[Erro] ' + args.map(safeStringify).join(' '));
  };

  // Audio Feedback Service
  notificador = new NotificadorVoz(mainWindow);

  // Background Services — não devem impedir a abertura da janela
  try {
    iniciarPolling(notificador);
  } catch (e) {
    console.warn('[Agent] Poller de hardware falhou na inicialização (sem hardware conectado?):', e);
  }

  try {
    iniciarSync();
  } catch (e) {
    console.warn('[Agent] Sincronização com nuvem falhou na inicialização (servidor indisponível?):', e);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
