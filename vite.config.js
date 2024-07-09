import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import nightwatchPlugin from 'vite-plugin-nightwatch'
// import vueDevTools from 'vite-plugin-vue-devto/ols'
// import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0'
  },
  plugins: [
    vue(),
    vueJsx(),
    nightwatchPlugin(),
    // vueDevTools(),
    // VitePWA({
    //   manifest: {
    //     name: 'AlienReader',
    //     short_name: 'ard',
    //     description: 'a reader for aliens',
    //     theme_color: 'hsla(160, 100%, 37%, 1)',
    //     icons: [{ src: '/favicon.png', sizes: '564x565', type: 'image/png' }]
    //   },
    //   registerType: 'autoUpdate',
    //   devOptions: {
    //     enabled: true
    //   }
    // })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
