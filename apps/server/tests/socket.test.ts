import { PROTOCOL_VERSION, type ServerMessage } from '@aglaea/shared';
import { describe, expect, test, vi } from 'vite-plus/test';

import { RoomManager } from '../src/room-manager.ts';
import { createRoomSocketHandlers } from '../src/socket.ts';

function createSocket() {
  const messages: ServerMessage[] = [];

  return {
    data: {},
    messages,
    send: (raw: string) => messages.push(JSON.parse(raw) as ServerMessage),
    close: vi.fn(),
  };
}

function setup() {
  const rooms = new RoomManager();
  const { room, ownerToken } = rooms.createRoom();
  const handlers = createRoomSocketHandlers(rooms);

  const hello = {
    type: 'hello',
    payload: {
      protocolVersion: PROTOCOL_VERSION,
      roomCode: room.code,
      clientId: 'owner',
      name: 'Owner',
      role: 'owner',
      kind: 'browser',
      ownerToken,
    },
  };

  return { rooms, room, handlers, hello };
}

describe('room sockets', () => {
  test('keeps the replacement connection joined when the previous socket closes', () => {
    const { rooms, room, handlers, hello } = setup();
    const previous = createSocket();
    const current = createSocket();
    handlers.message(previous, hello);
    handlers.message(current, hello);
    expect(previous.close).toHaveBeenCalledOnce();
    handlers.close(previous);
    expect(rooms.snapshot(room).members).toHaveLength(1);
    handlers.message(current, {
      type: 'control',
      payload: { action: { type: 'seek', position: 42 } },
    });
    expect(current.messages).toContainEqual(expect.objectContaining({ type: 'control' }));
    expect(rooms.snapshot(room).playback.position).toBe(42);
    handlers.close(current);
    expect(rooms.snapshot(room).members).toHaveLength(0);
  });

  test('isolates connection registries between server instances', () => {
    const { rooms, handlers, hello } = setup();
    const otherHandlers = createRoomSocketHandlers(rooms);
    const first = createSocket();
    const other = createSocket();
    handlers.message(first, hello);
    otherHandlers.message(other, hello);
    expect(first.close).not.toHaveBeenCalled();
    first.messages.length = 0;
    other.messages.length = 0;
    handlers.message(first, { type: 'control', payload: { action: { type: 'pause' } } });
    expect(first.messages.map(message => message.type)).toEqual(['control', 'snapshot']);
    expect(other.messages).toEqual([]);
  });

  test('reports invalid input and requires hello before handling room messages', () => {
    const { handlers } = setup();
    const socket = createSocket();
    handlers.message(socket, '{');
    handlers.message(socket, {});
    handlers.message(socket, { type: 'ping', payload: { clientTime: 123 } });
    expect(socket.messages).toEqual([
      expect.objectContaining({ payload: expect.objectContaining({ code: 'BAD_JSON' }) }),
      expect.objectContaining({ payload: expect.objectContaining({ code: 'BAD_MESSAGE' }) }),
      expect.objectContaining({ payload: expect.objectContaining({ code: 'NOT_JOINED' }) }),
    ]);
  });
});
