// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'D&D Session Notes Manager',
        short_name: 'D&D Notes',
        description: 'Advanced note manager for D&D sessions',
        theme_color: '#1e1e2e',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            section: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            section: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\.(?:html|js|css|json)$/,
            handler: 'StaleWhileRevalidate'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
