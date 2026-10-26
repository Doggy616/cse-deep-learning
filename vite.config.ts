import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icon-192.png', 'icon-512.png'],
    manifest: {
      name: '注安深度学习系统 V0.1', short_name: '注安深学', lang: 'zh-CN',
      description: '原创演示 · 注册安全工程师四科学习与复习',
      theme_color: '#174b43', background_color: '#f4f6f2', display: 'standalone',
      start_url: '/', scope: '/',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
      ]
    },
    workbox: { globPatterns: ['**/*.{js,css,html,png,svg,ico}'], navigateFallback: 'index.html', cleanupOutdatedCaches: true }
  })],
  test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], restoreMocks: true }
});
