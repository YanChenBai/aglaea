import { PROTOCOL_VERSION, roomCodeSchema, type ServerMessage } from '@aglaea/shared';
import { Elysia, t } from 'elysia';

import { roomError } from './errors.ts';
import { RoomError, type RoomManager } from './room-manager.ts';
import type { createRoomSocketHandlers } from './socket.ts';

export function createRoomRoutes(
  rooms: RoomManager,
  websiteUrl: string,
  sockets: Pick<ReturnType<typeof createRoomSocketHandlers>, 'leaveConnection'>,
) {
  const createRoomBody = t.Object({ name: t.Optional(t.String({ minLength: 1, maxLength: 24 })) });

  return new Elysia()
    .get(
      '/health',
      () => ({
        ok: true,
        service: 'aglaea-server',
        protocolVersion: PROTOCOL_VERSION,
        rooms: rooms.roomCount(),
        uptime: process.uptime(),
      }),
      {
        detail: { summary: '健康检查', tags: ['system'] },
        response: {
          200: t.Object({
            ok: t.Boolean(),
            service: t.String(),
            protocolVersion: t.Number(),
            rooms: t.Number(),
            uptime: t.Number(),
          }),
        },
      },
    )
    .post(
      '/api/rooms/:code/leave',
      ({ params, body }) => {
        sockets.leaveConnection(roomCodeSchema.parse(params.code), body.connectionToken);

        return { ok: true };
      },
      {
        params: t.Object({ code: t.String() }),
        body: t.Object({ connectionToken: t.String({ minLength: 1, maxLength: 80 }) }),
        detail: { summary: '退出当前连接', tags: ['rooms'] },
      },
    )
    .post(
      '/api/rooms',
      ({ body, set }) => {
        void body;
        const { room, ownerToken } = rooms.createRoom();
        set.status = 201;

        return {
          roomCode: room.code,
          ownerToken,
          snapshot: rooms.snapshot(room),
        };
      },
      {
        body: createRoomBody,
        detail: { summary: '创建房间', tags: ['rooms'] },
      },
    )
    .get(
      '/api/rooms/:code',
      ({ params, set }) => {
        const code = roomCodeSchema.parse(params.code);
        const room = rooms.peekRoom(code);

        if (!room) {
          set.status = 404;

          return { error: 'ROOM_NOT_FOUND' as const, message: `Room ${params.code} was not found` };
        }

        return { snapshot: rooms.snapshot(room) };
      },
      {
        params: t.Object({ code: t.String() }),
        detail: { summary: '查询房间', tags: ['rooms'] },
      },
    )
    .post(
      '/api/rooms/:code/controllers',
      ({ params, body, set }) => {
        try {
          return rooms.createControllerTicket(
            roomCodeSchema.parse(params.code),
            body.clientId,
            websiteUrl,
          );
        } catch (error) {
          const payload: ServerMessage = roomError(error);
          set.status = error instanceof RoomError && error.code === 'ROOM_NOT_FOUND' ? 404 : 403;

          if (payload.type !== 'error') {
            set.status = 500;

            return { error: 'INTERNAL', message: 'Unexpected error' };
          }

          return { error: payload.payload.code, message: payload.payload.message };
        }
      },
      {
        body: t.Object({ clientId: t.String({ minLength: 1, maxLength: 80 }) }),
        params: t.Object({ code: t.String() }),
        detail: { summary: '创建手机遥控令牌', tags: ['controllers'] },
      },
    );
}
