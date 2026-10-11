import { vueConfig } from '@nativescript/vite/vue';
// NativeScript CLI 需要标准 Vite 的可执行入口。
// eslint-disable-next-line vite-plus/prefer-vite-plus-imports
import { defineConfig, mergeConfig } from 'vite';

export default defineConfig(({ mode }) =>
  mergeConfig(vueConfig({ mode }), {
    resolve: { preserveSymlinks: false },
    // 注入脚本通过函数序列化，保持函数内部标识符独立。
    build: { minify: false },
  }),
);
