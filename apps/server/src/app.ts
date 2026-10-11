import { DEFAULT_HEARTBEAT_INTERVAL_MS } from '@aglaea/shared';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { staticPlugin } from '@elysiajs/static';
import { Elysia } from 'elysia';

import type { ServerConfig } from './config.ts';
import { RoomManager } from './room-manager.ts';
import { createRoomRoutes } from './routes.ts';
import { createRoomSocketHandlers } from './socket.ts';

export function createApp(config: ServerConfig, rooms = new RoomManager()) {
  const sockets = createRoomSocketHandlers(rooms);
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  return new Elysia()
    .onStart(() => {
      heartbeatTimer = setInterval(sockets.sweep, DEFAULT_HEARTBEAT_INTERVAL_MS);
    })
    .onStop(() => {
      clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    })
    .use(
      cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
      }),
    )
    .use(
      openapi({
        path: '/openapi',
        documentation: {
          info: {
            title: 'Aglaea API',
            version: '0.0.0',
            description:
              'Aglaea 内存房间同步服务。REST 负责房间与遥控令牌，WebSocket `/ws` 负责播放状态与控制事件。',
          },
          tags: [
            { name: 'rooms', description: '房间生命周期与状态查询' },
            { name: 'controllers', description: '手机遥控令牌' },
            { name: 'system', description: '运行状态' },
          ],
        },
      }),
    )
    .use(
      config.staticRoot
        ? staticPlugin({ assets: config.staticRoot, prefix: '' })
        : new Elysia({ name: 'aglaea-static-noop' }),
    )
    .use(createRoomRoutes(rooms, config.websiteUrl, sockets))
    .ws('/ws', {
      message: sockets.message,
      close: sockets.close,
      detail: {
        summary: '房间 WebSocket',
        description: '客户端先发送 hello 加入房间；随后可发送 sync、control、ping、leave。',
        tags: ['rooms'],
      },
    });
}

export type AglaeaServer = ReturnType<typeof createApp>;
