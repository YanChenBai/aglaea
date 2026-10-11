import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/index.ts', 'src/vue.ts'],
    dts: {
      generator: 'tsc',
    },
    exports: true,
  },
});
