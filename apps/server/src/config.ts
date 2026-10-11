import { DEFAULT_SERVER_PORT } from '@aglaea/shared';

export function readServerConfig(env: Record<string, string | undefined>) {
  const port = Number(env.PORT ?? env.AGLAEA_PORT ?? DEFAULT_SERVER_PORT);
  const publicUrl = env.AGLAEA_PUBLIC_URL ?? `http://localhost:${port}`;
  const websiteUrl = env.AGLAEA_WEBSITE_URL ?? 'http://localhost:5173';
  const staticRoot = env.AGLAEA_STATIC_ROOT;

  const hostname = env.HOST ?? '0.0.0.0';

  return { port, publicUrl, websiteUrl, staticRoot, hostname };
}

export type ServerConfig = ReturnType<typeof readServerConfig>;
