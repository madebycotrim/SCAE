/* eslint-env node */
/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  /**
   * Plugin que bloqueia o acesso ao frontend pelo domínio do agente.
   * Apenas rotas /api/ são permitidas por agente.catraki.com.br.
   */
  const bloqueioAgentePlugin = () => ({
    name: 'bloqueio-agente',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const host = req.headers.host || '';
        const ehDominioAgente = host.includes('agente.catraki.com.br');
        const ehRotaApi = req.url?.startsWith('/api/');

        if (ehDominioAgente && !ehRotaApi) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            erro: 'Acesso restrito', 
            mensagem: 'Este endpoint é exclusivo para comunicação com o Agente Catraki.' 
          }));
          return;
        }
        next();
      });
    }
  });

  return {
    base: '/',
    plugins: [
      bloqueioAgentePlugin(),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@tenant': path.resolve(__dirname, './src/tenant'),
        '@funcionalidades': path.resolve(__dirname, './src/funcionalidades'),
        '@compartilhado': path.resolve(__dirname, './src/compartilhado'),
        '@configuracoes': path.resolve(__dirname, './src/configuracoes'),
        '@principal': path.resolve(__dirname, './src/principal'),
      }
    },
    server: {
      allowedHosts: ['agente.catraki.com.br'],
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:8788/',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
