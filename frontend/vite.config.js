import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts = env.VITE_ALLOWED_HOSTS ? env.VITE_ALLOWED_HOSTS.split(',') : undefined;

  return {
    server: {
      port: 5000,
      host: '0.0.0.0',
      allowedHosts: allowedHosts,
      proxy: {
        '/api': {
          target: 'http://backend:3001',
          changeOrigin: true,
        }
      }
    },

    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
        manifest: {
          name: '麵包國圖書管理',
          short_name: '麵包國圖書館',
          description: '麵包國圖書管理系統 (PWA)',
          theme_color: '#f2f2f7',
          display: 'standalone',
          display_override: ['fullscreen', 'minimal-ui', 'standalone'],
          icons: [
            {
              src: '/bread-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/bread-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ]
  };
});
