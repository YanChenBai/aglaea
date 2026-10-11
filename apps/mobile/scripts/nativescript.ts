import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(project, 'package.json'));
const manifest = require('nativescript/package.json') as { bin: { ns: string } };
const cli = resolve(dirname(require.resolve('nativescript/package.json')), manifest.bin.ns);

const sdk =
  process.env.ANDROID_HOME ??
  process.env.ANDROID_SDK_ROOT ??
  join(homedir(), 'AppData/Local/Android/Sdk');

// Bun 执行入口脚本；NativeScript CLI 使用 Node，保持原生构建工具兼容。
const result = spawnSync('node', [cli, ...process.argv.slice(2)], {
  cwd: project,
  stdio: 'inherit',
  env: {
    ...process.env,
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    // CLI 的 Bun 适配器仍用 npm view 查询版本；允许该查询读取 Bun 工作区。
    npm_config_force: 'true',
  },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
