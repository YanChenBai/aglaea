import type { AglaeaServer } from '@aglaea/server';
import { treaty, type Treaty } from '@elysiajs/eden';

export type AglaeaClient = Treaty.Create<AglaeaServer>;

export function createClient(serverUrl: string, options?: Treaty.Config): AglaeaClient {
  return treaty<AglaeaServer>(serverUrl.replace(/\/$/, ''), options);
}
