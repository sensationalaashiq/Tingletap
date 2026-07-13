import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // ── Progressive Web App — Service Worker via Workbox ──────────────────────
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Use existing public/manifest.json — don't let the plugin overwrite it
      manifest: false,

      // Include extra assets for precaching
      includeAssets: ['favicon.svg', 'tingletap-logo.jpg', 'robots.txt'],

      workbox: {
        // Precache all built assets — raise limit above the large main bundle
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB

        // Service worker filename
        swDest: 'sw.js',

        // Don't cache Firebase RTDB / Firestore realtime streams
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/__\//, /^\/\.netlify\//],

        // Runtime caching rules
        runtimeCaching: [
          // Google Fonts stylesheets — Cache First (1 year)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts files — Cache First (1 year)
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Firebase Storage images — Cache First (30 days)
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Randomuser avatars — Cache First (7 days)
          {
            urlPattern: /^https:\/\/randomuser\.me\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'avatar-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Giphy — Stale While Revalidate (24h)
          {
            urlPattern: /^https:\/\/api\.giphy\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'giphy-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // C17: R2 public CDN images (pub-*.r2.dev) — Cache First (7 days)
          {
            urlPattern: /^https:\/\/pub-[a-zA-Z0-9]+\.r2\.dev\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'r2-public-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      devOptions: {
        enabled: false, // keep dev fast — SW only active in production build
      },
    }),
  ],

  // C13: Path alias — import from '@/components/Foo' instead of '../../components/Foo'
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(new URL(import.meta.url).pathname), 'src'),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    // All API calls go to /.netlify/functions/* — handled by Netlify in production.
    // No dev proxy needed; use `netlify dev` locally if you need to invoke functions.
  },
})
