import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

const icons = {
  16: 'icons/aglaea-head-16.png',
  32: 'icons/aglaea-head-32.png',
  48: 'icons/aglaea-head-48.png',
  128: 'icons/aglaea-head-128.png',
};

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'Aglaea',
    description: 'Synchronize Bilibili playback with friends in a shared room.',
    version: '0.0.0',
    icons,
    permissions: ['storage', 'clipboardWrite'],
    host_permissions: ['https://*.bilibili.com/*', 'http://localhost/*', 'https://*/*'],
    action: {
      default_title: 'Aglaea',
      default_icon: icons,
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
