import { createApp } from './app.ts';
import { readServerConfig } from './config.ts';
const config = readServerConfig(Bun.env);
const app = createApp(config).listen({ port: config.port, hostname: config.hostname });
process.stdout.write(`Aglaea server listening on ${config.publicUrl}\n`);
export type AglaeaServer = typeof app;
