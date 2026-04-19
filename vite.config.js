/* eslint-env node */
/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
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
    base: './',
    plugins: [
      bloqueioAgentePlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-able-icon.png', 'sons/*.mp3'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,mp3}'],
          // Garante que o app funcione mesmo se o servidor cair
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // Fontes e Assets Estáticos (Cache First)
              urlPattern: ({ request }) => request.destination === 'font' || request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'scae-static-assets',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 } // 30 dias
              }
            },
            {
              // API de Perfil da Escola (Stale While Revalidate)
              // Carrega rápido do cache, mas atualiza por baixo dos panos
              urlPattern: /\/api\/publico\/detalhes/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'scae-school-profile',
                expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 } // 24h
              }
            },
            {
              // API de Horários e Configurações (Network First)
              // Tenta rede (para novos horários), mas se falhar usa o cache
              urlPattern: /\/api\/admin\/(horarios|configuracoes)/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'scae-admin-configs',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 12 } // 12h
              }
            }
          ]
        },
        manifest: {
          name: 'SCAE — Sistema de Controle de Acesso Escolar',
          short_name: 'SCAE',
          description: 'Controle de acesso escolar com QR Code, modo quiosque e notificações.',
          theme_color: '#4f46e5',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          categories: ['education', 'utilities'],
          icons: [
            { src: '/icons/icon-48x48.png', sizes: '48x48', type: 'image/png' },
            { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
            { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
            { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
            { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
            { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ],
        },
      }),
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
        'Cross-Origin-Opener-Policy': 'unsafe-none',
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
