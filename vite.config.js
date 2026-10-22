import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Проект живёт на GitHub Pages по адресу /baby-log/, поэтому все пути собираются
// от этого префикса. Для локальной разработки Vite сам подставит '/'.
// Сборка для магазинов (`vite build --mode native`) кладёт файлы внутрь
// приложения: пути относительные, service worker не нужен — офлайн и так есть.
export default defineConfig(({ mode }) => {
  const native = mode === 'native'
  const base = native ? './' : process.env.VITE_BASE ?? '/baby-log/'
  return {
  base,
  plugins: [
    react(),
    VitePWA({
      // в нативной сборке модуль регистрации остаётся, но ничего не делает
      disable: native,
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon-180x180.png', 'favicon.png'],
      manifest: {
        name: 'Дневник ухода',
        short_name: 'Дневник',
        lang: 'ru',
        description: 'Кормления, подгузники и сон — общий журнал для всей семьи',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        id: base,
        background_color: '#10131A',
        theme_color: '#10131A',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}
})
