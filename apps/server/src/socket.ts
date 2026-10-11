import {
  clientMessageSchema,
  DEFAULT_HEARTBEAT_TIMEOUT_MS,
  PROTOCOL_VERSION,
  type ClientMessage,
  type ControlAction,
  type ServerMessage,
} from '@aglaea/shared';

import { roomError } from './errors.ts';
import type { RoomManager, RoomRecord, RoomUserRecord } from './room-manager.ts';

interface SocketData {
  roomCode?: string;
  clientId?: string;
  user?: RoomUserRecord;
  connectionToken?: string;
  lastSeenAt?: number;
}

interface AglaeaSocket {
  data: object;
  send(message: string): unknown;
  close(): unknown;
}

interface HelloContext {
  room: RoomRecord;
  user: RoomUserRecord;
}

export function createRoomSocketHandlers(rooms: RoomManager) {
  const clientsByRoom = new Map<string, Map<string, AglaeaSocket>>();
  const connections = new Map<string, AglaeaSocket>();

  function send(socket: AglaeaSocket, message: ServerMessage): void {
    socket.send(JSON.stringify(message));
  }

  function roomClients(roomCode: string): Map<string, AglaeaSocket> {
    let clients = clientsByRoom.get(roomCode);

    if (!clients) {
      clients = new Map();
      clientsByRoom.set(roomCode, clients);
    }

    return clients;
  }

  function broadcast(roomCode: string, message: ServerMessage, exceptClientId?: string): void {
    for (const [clientId, socket] of roomClients(roomCode)) {
      if (clientId !== exceptClientId) {
        send(socket, message);
      }
    }
  }

  function socketData(socket: AglaeaSocket): SocketData {
    return socket.data as SocketData;
  }

  function joinSocket(
    socket: AglaeaSocket,
    payload: Extract<ClientMessage, { type: 'hello' }>['payload'],
  ): void {
    const joined = rooms.join({
      roomCode: payload.roomCode,
      clientId: payload.clientId,
      name: payload.name,
      role: payload.role,
      kind: payload.kind,
      ownerToken: payload.ownerToken,
      controllerToken: payload.controllerToken,
    });

    socketData(socket).roomCode = joined.room.code;
    socketData(socket).clientId = joined.user.clientId;
    socketData(socket).user = joined.user;
    const connectionToken = crypto.randomUUID();
    socketData(socket).connectionToken = connectionToken;
    socketData(socket).lastSeenAt = Date.now();
    connections.set(connectionToken, socket);
    const previous = roomClients(joined.room.code).get(joined.user.clientId);
    roomClients(joined.room.code).set(joined.user.clientId, socket);

    if (previous && previous.data !== socket.data) {
      leaveSocket(previous);
      previous.close();
    }

    send(socket, {
      type: 'hello',
      payload: {
        protocolVersion: PROTOCOL_VERSION,
        snapshot: joined.snapshot,
        you: joined.user,
        connectionToken,
      },
    });
    broadcast(
      joined.room.code,
      { type: 'member-joined', payload: { member: joined.user, snapshot: joined.snapshot } },
      joined.user.clientId,
    );
  }

  function controlSocket(context: HelloContext, action: ControlAction): void {
    const targetClientId = rooms.controlTarget(context.room.code, context.user.clientId, action);

    const snapshot = rooms.applyControl(context.room.code, context.user.clientId, action);

    const targetSocket = roomClients(context.room.code).get(targetClientId);

    if (targetSocket) {
      send(targetSocket, {
        type: 'control',
        payload: {
          action: action,
          originClientId: context.user.clientId,
          targetClientId,
          serverClock: Date.now(),
        },
      });
    }

    if (action.type !== 'volume' && action.type !== 'fullscreen' && action.type !== 'resync') {
      broadcast(context.room.code, { type: 'snapshot', payload: snapshot });
    }
  }

  function message(socket: AglaeaSocket, raw: unknown): void {
    let parsed: unknown;

    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      send(socket, {
        type: 'error',
        payload: { code: 'BAD_JSON', message: 'Message must be valid JSON' },
      });

      return;
    }

    const decoded = clientMessageSchema.safeParse(parsed);

    if (!decoded.success) {
      send(socket, {
        type: 'error',
        payload: { code: 'BAD_MESSAGE', message: decoded.error.message },
      });

      return;
    }

    const message = decoded.data;

    if (message.type === 'hello') {
      try {
        joinSocket(socket, message.payload);
      } catch (error) {
        send(socket, roomError(error));
      }

      return;
    }

    const context = getSocketContext(socket);

    if (!context) {
      send(socket, {
        type: 'error',
        payload: { code: 'NOT_JOINED', message: 'Send hello before other messages' },
      });

      return;
    }

    try {
      socketData(socket).lastSeenAt = Date.now();

      switch (message.type) {
        case 'sync': {
          const snapshot = rooms.applyPlayback(
            context.room.code,
            context.user.clientId,
            message.payload,
          );

          broadcast(context.room.code, {
            type: 'sync',
            payload: {
              ...snapshot,
              source: message.payload.source,
              originClientId: context.user.clientId,
            },
          });
          break;
        }

        case 'control': {
          controlSocket(context, message.payload.action);
          break;
        }

        case 'ping': {
          rooms.markSeen(context.room.code, context.user.clientId);
          send(socket, {
            type: 'pong',
            payload: {
              clientTime: message.payload.clientTime,
              serverTime: Date.now(),
              roomRound: context.room.round,
            },
          });
          break;
        }

        case 'leave': {
          leaveSocket(socket);
          socket.close();
          break;
        }
      }
    } catch (error) {
      send(socket, roomError(error));
    }
  }

  function getSocketContext(socket: AglaeaSocket): HelloContext | undefined {
    const data = socketData(socket);

    if (
      !data.roomCode ||
      !data.clientId ||
      !data.user ||
      clientsByRoom.get(data.roomCode)?.get(data.clientId)?.data !== socket.data
    ) {
      return undefined;
    }

    try {
      const room = rooms.getRoom(data.roomCode);
      const user = room.users.get(data.clientId);

      if (!user || !user.connected) {
        return undefined;
      }

      data.user = user;

      return { room, user };
    } catch {
      return undefined;
    }
  }

  function leaveSocket(socket: AglaeaSocket): void {
    const data = socketData(socket);
    const { roomCode, clientId, connectionToken } = data;

    if (connectionToken) {
      connections.delete(connectionToken);
      data.connectionToken = undefined;
    }

    if (!roomCode || !clientId) {
      return;
    }

    // Elysia 每次回调创建新的包装对象，用共享 data 识别同一连接。
    // 旧连接的 close 事件不能移除已重连的同一客户端。
    if (clientsByRoom.get(roomCode)?.get(clientId)?.data !== socket.data) {
      return;
    }

    const room = rooms.peekRoom(roomCode);

    if (!room) {
      clientsByRoom.get(roomCode)?.delete(clientId);

      return;
    }

    roomClients(roomCode).delete(clientId);
    const user = room.users.get(clientId);

    if (!user) {
      return;
    }

    const { room: nextRoom } = rooms.leave(roomCode, clientId);
    socketData(socket).roomCode = undefined;
    socketData(socket).clientId = undefined;
    socketData(socket).user = undefined;
    broadcast(roomCode, {
      type: 'member-left',
      payload: { member: user, snapshot: rooms.snapshot(nextRoom) },
    });

    if (clientsByRoom.get(roomCode)?.size === 0) {
      clientsByRoom.delete(roomCode);
    }
  }

  function leaveConnection(roomCode: string, connectionToken: string): void {
    const socket = connections.get(connectionToken);

    if (!socket || socketData(socket).roomCode !== roomCode) {
      return;
    }

    // 令牌只属于这一次连接，旧页面迟到的退出请求不能移除重连后的客户端。
    leaveSocket(socket);
    socket.close();
  }

  function sweep(): void {
    const now = Date.now();

    for (const socket of connections.values()) {
      if (now - (socketData(socket).lastSeenAt ?? 0) >= DEFAULT_HEARTBEAT_TIMEOUT_MS) {
        leaveSocket(socket);
        socket.close();
      }
    }

    rooms.pruneExpired();
  }

  return { message, close: leaveSocket, leaveConnection, sweep };
}
