import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'artifact' ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'artifact' ? [viteSingleFile()] : []),
    // خدمة الـ Service Worker ما تشتغل جوا إطار الـ Artifact المعزول، فتفعّل بس بالبناء العادي
    ...(mode !== 'artifact'
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            manifest: {
              name: 'StudySync — منصة إدارة أبحاث التخرج',
              short_name: 'StudySync',
              description: 'رفيقكم بمشروع التخرج — ينظّم فريقكم ومهامكم ويخلّي التنسيق أسهل من قهوة الصبح ☕',
              lang: 'ar',
              dir: 'rtl',
              start_url: '/',
              display: 'standalone',
              theme_color: '#0a0a0a',
              background_color: '#0a0a0a',
              icons: [
                { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                {
                  src: '/icons/icon-maskable-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
          }),
        ]
      : []),
  ],
}))
