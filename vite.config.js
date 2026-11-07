// vite.config.js
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import {
  assertFeatureDependencies,
  featureDefines,
  resolveFeatureFlags,
} from './scripts/feature-catalog.mjs';
import { createFeaturePlugin } from './scripts/feature-flags-plugin.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const flags = resolveFeatureFlags(env);
  assertFeatureDependencies(flags);

  const shortcut = (name, shortName, description, url, enabled) =>
    enabled
      ? {
          name,
          short_name: shortName,
          description,
          url,
          icons: [
            {
              src: '/dmh-pwa/icon-96.png',
              sizes: '96x96',
              type: 'image/png',
            },
          ],
        }
      : null;

  const shortcuts = [
    shortcut(
      'Notes',
      'Notes',
      'Open campaign notes',
      '/dmh-pwa/notes',
      flags.notes,
    ),
    shortcut(
      'Timers',
      'Timers',
      'Open countdown timers',
      '/dmh-pwa/timers',
      flags.timers,
    ),
    shortcut(
      'Jukebox',
      'Jukebox',
      'Open the music player',
      '/dmh-pwa/jukebox',
      flags.jukebox,
    ),
    shortcut(
      'Help center',
      'Help',
      'Open installation and troubleshooting guides',
      '/dmh-pwa/help/en/index.html',
      flags.help,
    ),
  ].filter(Boolean);

  return {
    base: '/dmh-pwa',
    define: featureDefines(flags),
    plugins: [
      createFeaturePlugin(flags),
      vue({
        template: { transformAssetUrls },
      }),
      quasar({
        autoImportComponentCase: 'pascal',
        sassVariables: fileURLToPath(
          new URL('./src/assets/styles/quasar-variables.sass', import.meta.url),
        ),
      }),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        includeAssets: [
          'icon-192.png',
          'icon-512.png',
          'icon-72.png',
          'icon-96.png',
          'icon-128.png',
          'icon-144.png',
          'icon-152.png',
          'icon-384.png',
        ],
        manifest: {
          id: '/dmh-pwa/',
          name: "Owlbear's Dungeon Master Helper",
          short_name: "Owlbear's DMH",
          description:
            'Advanced note manager for D&D sessions with character management, encounter tracking, and campaign organization',
          theme_color: '#1e1e2e',
          background_color: '#1e1e2e',
          display: 'standalone',
          orientation: 'any',
          scope: '/dmh-pwa/',
          start_url: '/dmh-pwa/',
          launch_handler: {
            client_mode: 'focus-existing',
          },
          prefer_related_applications: false,
          related_applications: [],
          shortcuts,
          screenshots: [
            {
              src: '/dmh-pwa/screenshots/app-desktop.png',
              sizes: '1280x800',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Owlbear’s DMH notes workspace',
            },
            {
              src: '/dmh-pwa/screenshots/app-mobile.png',
              sizes: '390x844',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Owlbear’s DMH on a phone',
            },
          ],
          icons: [
            {
              src: '/dmh-pwa/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/dmh-pwa/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/dmh-pwa/icon-72.png',
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/dmh-pwa/icon-96.png',
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/dmh-pwa/icon-128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/dmh-pwa/icon-144.png',
              sizes: '144x144',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/dmh-pwa/icon-152.png',
              sizes: '152x152',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/dmh-pwa/icon-384.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any',
            },
          ],
          categories: ['productivity', 'games', 'utilities'],
          lang: 'en',
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 30000000,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // Inline registration bypasses the plugin's autoUpdate defaults, so
          // activate and claim immediately; PWAStatus then shows the update
          // banner for the resulting controller change.
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
            {
              urlPattern: /^https:\/\/.*\.(js|css)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-resources-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
              },
            },
          ],
          cleanupOutdatedCaches: true,
          sourcemap: true,
        },
        devOptions: {
          enabled: true,
          type: 'module',
          // Dev builds only emit the worker itself, so the production glob
          // patterns match nothing in dev-dist and Workbox logs a warning.
          suppressWarnings: true,
        },
      }),
    ],
    build: {
      emptyOutDir: false,
    },
    server: {
      proxy: {
        '/dmh-pwa/help': 'http://localhost:5174',
      },
    },
    preview: {
      proxy: {},
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    worker: {
      format: 'es',
    },
  };
});
