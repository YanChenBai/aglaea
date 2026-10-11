import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [vue({ features: { vapor: true } }), tailwindcss()],
  server: {
    port: 5174,
  },
});
