import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    dts: {
      generator: 'tsc',
    },
    exports: true,
  },
});
