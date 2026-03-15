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

  return {
    plugins: [
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
            {
              src: '/icones/pwa-192x192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
            },
            {
              src: '/icones/pwa-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
            },
            {
              src: '/icones/pwa-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    server: {
      proxy: {
        '/api': {
          target:'https://scae.pages.dev',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
