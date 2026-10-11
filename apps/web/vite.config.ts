import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [vue({ features: { vapor: true } }), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        remote: 'remote.html',
      },
    },
  },
});
