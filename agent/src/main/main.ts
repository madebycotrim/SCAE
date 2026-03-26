import 'dotenv/config';
import { app, BrowserWindow, nativeImage, Menu } from 'electron';
import path from 'path';
import { iniciarPolling } from '../services/poller';
import { iniciarSync } from '../services/sync';
import { criarTray } from './tray';
import { NotificadorVoz } from '../services/notificador-voz';

let mainWindow: BrowserWindow | null = null;
let notificador: NotificadorVoz | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 480,
    resizable: true, // Permitir redimensionamento suave
    title: 'SCAE Agent Local Service',
    icon: nativeImage.createEmpty(), // Substituir por ícone real (icns/ico)
    autoHideMenuBar: true, // Esconder menu nativo para visual SaaS
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Estilo Premium Inline (Simulação de Dashboard)
  const dashboardHtml = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <script src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"></script>
      <style>
        body { margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #1e293b; color-scheme: light; }
        .header { background: #0f172a; color: white; padding: 1.5rem 2rem; border-bottom: 4px solid #4f46e5; text-align: center; }
        .header h1 { margin: 0; font-size: 1.25rem; font-weight: 900; letter-spacing: -0.025em; text-transform: uppercase; }
        .status-badge { display: inline-flex; align-items: center; gap: 0.5rem; background: #22c55e20; color: #15803d; padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-top: 0.5rem; border: 1px solid #22c55e40; }
        .container { padding: 1.5rem; display: grid; gap: 1.5rem; grid-template-columns: 1fr 1fr; }
        .card { background: white; border-radius: 1.5rem; padding: 1.25rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .card-full { grid-column: span 2; }
        .card-title { font-size: 0.65rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
        .cam-frame { width: 100%; aspect-ratio: 1; background: #000; border-radius: 50%; overflow: hidden; border: 4px solid #4f46e5; position: relative; margin: 0 auto; max-width: 180px; }
        #camera-feed { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        .stat-value { font-size: 1.1rem; font-weight: 800; color: #1e293b; }
        .log-area { background: #0f172a; border-radius: 1rem; padding: 1rem; color: #94a3b8; font-family: 'Consolas', monospace; font-size: 10px; height: 100px; overflow-y: auto; border: 1px solid #1e293b; }
        .footer { text-align: center; padding: 1rem; font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .pulse { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); animation: pulse 2s infinite; }
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }
      </style>
    </head>
    <body onload="iniciarFace()">
      <div class="header">
        <h1>SCAE Edge Agent</h1>
        <div class="status-badge"><div class="pulse"></div> Monitoramento Facial Ativo</div>
      </div>
      <div class="container">
        <div class="card">
          <div class="card-title">👁️ Scanner Facial Borda</div>
          <div class="cam-frame"><video id="camera-feed" autoplay muted playsinline></video></div>
        </div>
        <div class="card">
          <div class="card-title">📡 Status Hardware</div>
          <div class="stat-value" id="status-hardware">Detectando...</div>
          <div id="reconhecimento-alvo" style="margin-top:1rem; font-size:11px; font-weight:900; color:#4f46e5;">SCANNER ONLINE</div>
        </div>
        <div class="card card-full">
          <div class="card-title">💾 Registros Recentes (Local)</div>
          <div class="log-area" id="log-box">
            Aguardando inicialização da câmera...<br>
          </div>
        </div>
      </div>
      <script>
        async function iniciarFace() {
          const video = document.getElementById('camera-feed');
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            video.srcObject = stream;
            
            // Carregando Modelos Lite do Disco ou CDN
            const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            
            adicionarLog("SCAE Facial Ready: Modelos carregados.");
            processarFrame();
          } catch (err) {
            adicionarLog("Erro ao carregar câmera: " + err.message);
          }
        }

        async function processarFrame() {
          const video = document.getElementById('camera-feed');
          if (video.paused || video.ended) return setTimeout(() => processarFrame(), 1000);

          const detecao = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                       .withFaceLandmarks()
                                       .withFaceDescriptor();

          if (detecao) {
            // Aqui entraria a comparação com a lista de matriculas (IPC)
            // Por enquanto simulamos o scanner ativo
            document.getElementById('reconhecimento-alvo').innerText = "Vetor BIO Extraído ✓";
          } else {
            document.getElementById('reconhecimento-alvo').innerText = "PROCURANDO ROSTO...";
          }

          requestAnimationFrame(processarFrame);
        }

        function adicionarLog(msg) {
          const box = document.getElementById('log-box');
          box.innerHTML = '[' + new Date().toLocaleTimeString() + '] ' + msg + '<br>' + box.innerHTML;
        }
      </script>
      <div class="footer">RECONHECIMENTO FACIAL DE ALTA PRECISÃO (BORDA)</div>
    </body>
    </html>
  `.replace('${leitoresCount}', '2'); // Exemplo simplificado

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(dashboardHtml)}`);

  // Ocultar em vez de fechar
  mainWindow.on('close', (e: any) => {
    if (!(app as any).isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

const isDev = process.env.NODE_ENV === 'development';
const leitoresCount = 2; // Seria dinâmico vindo da config

app.whenReady().then(async () => {
  await createWindow();
  
  if (mainWindow) {
    criarTray(mainWindow);
    notificador = new NotificadorVoz(mainWindow);
  }

  // Inicia serviços de background
  console.log('[Main] Iniciando serviços do agente...');
  await iniciarPolling(notificador);
  await iniciarSync();
  console.log('[Main] Agente local em operação ✓');
});

// Impede que o app feche quando todas janelas são ocultadas
app.on('window-all-closed', (e: any) => {
  if (process.platform !== 'darwin') {
    // Não encerra o processo, permanece na bandeja
  }
});

// Garantir que encerre ao sair explicitamente
app.on('before-quit', () => {
  (app as any).isQuitting = true;
});
