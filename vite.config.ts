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
            workbox: {
              importScripts: ['push-sw.js'],
              // الصفحة نفسها من النت أول (وإذا ما فيه نت من المخزّن): أي تحديث جديد يطلع من أول ريفرش،
              // بدل ما يعلق الناس على نسخة قديمة لين تتحدث خدمة العامل
              navigateFallback: null,
              runtimeCaching: [
                {
                  urlPattern: ({ request }) => request.mode === 'navigate',
                  handler: 'NetworkFirst',
                  options: { cacheName: 'wesync-pages', networkTimeoutSeconds: 4 },
                },
              ],
              // مكتبة الاجتماعات كبيرة وما يحتاجها إلا اللي يدخل اجتماع: ما نخزّنها مسبقًا
              globIgnores: ['**/livekit-client*.js'],
            },
            manifest: {
              name: 'Wesync — منصة إدارة أبحاث التخرج',
              short_name: 'Wesync',
              description: 'رفيقكم بمشروع التخرج — ينظّم فريقكم ومهامكم ويخلّي التنسيق أسهل من قهوة الصبح ☕',
              lang: 'ar',
              dir: 'rtl',
              start_url: '/',
              display: 'standalone',
              theme_color: '#0a0a0a',
              background_color: '#0a0a0a',
              // «ارموا لـ Wesync» من قائمة المشاركة بالجوال (واتساب، الصور، الملفات…)
              share_target: {
                action: '/share-target',
                method: 'POST',
                enctype: 'multipart/form-data',
                params: {
                  title: 'title',
                  text: 'text',
                  url: 'url',
                  files: [{ name: 'files', accept: ['image/*', 'application/pdf', '.pdf', '.docx', '.xlsx', '.csv', 'text/*'] }],
                },
              },
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
