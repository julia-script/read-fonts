import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

const wrapper = (path: string) =>
  fileURLToPath(new URL(`../js/src/${path}`, import.meta.url))

export default defineConfig({
  base: './',
  plugins: [tailwindcss(), foldkit()],
  resolve: {
    alias: {
      'harfrust-wasm/effect': wrapper('effect.ts'),
      'harfrust-wasm': wrapper('index.ts'),
    },
  },
  optimizeDeps: {
    entries: ['src/entry.ts'],
  },
})
