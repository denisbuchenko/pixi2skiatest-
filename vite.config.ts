import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: '/pixi2skiatest/',
  resolve: {
    alias: {
      'pixi.js-legacy': fileURLToPath(new URL('./node_modules/pixi.js-legacy/dist/pixi-legacy.mjs', import.meta.url)),
      '@pixi/assets': fileURLToPath(new URL('./node_modules/@pixi/assets/lib/index.mjs', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
  },
});