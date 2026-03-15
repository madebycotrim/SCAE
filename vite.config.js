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
        includeAssets: ['sons/*.mp3'],
        workbox: {
          // Cache tudo para funcionar offline no tablet
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              // Cache de API com strategy Network First
              urlPattern: /^https?:\/\/.*\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'scae-api-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24, // 24 horas
                },
                networkTimeoutSeconds: 5,
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Cache de fontes do Google
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
                },
              },
            },
          ],
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
        '@escola': path.resolve(__dirname, './src/contexto-escola'),
        '@funcionalidades': path.resolve(__dirname, './src/funcionalidades'),
        '@compartilhado': path.resolve(__dirname, './src/compartilhado'),
        '@configuracoes': path.resolve(__dirname, './src/configuracoes'),
        '@principal': path.resolve(__dirname, './src/principal'),
      }
    },
    build: {
      outDir: 'dist',
      minify: 'esbuild',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
            'vendor-firebase': ['firebase/app', 'firebase/auth'],
            'vendor-charts': ['chart.js', 'react-chartjs-2'],
            'vendor-utils': ['date-fns', 'lucide-react', 'framer-motion'],
            'vendor-docs': ['jspdf', 'jspdf-autotable', 'xlsx'],
          }
        }
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
