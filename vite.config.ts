// FILE: vite.config.js

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import monacoEditorPlugin from "@vue3-oop/vite-plugin-monaco-editor"

// https://vitejs.dev/config/
export default defineConfig({
  base: "/utils/",
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),

    quasar({
      sassVariables: 'src/quasar-variables.sass'
    }),

    monacoEditorPlugin({
    })
  ]
})
