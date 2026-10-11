import type { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'dev.aglaea.mobile',
  appPath: 'src',
  appResourcesPath: 'App_Resources',
  bundler: 'vite',
  bundlerConfigPath: 'nativescript.vite.config.ts',
} satisfies NativeScriptConfig;
