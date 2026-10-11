import { DEFAULT_HEARTBEAT_TIMEOUT_MS, PROTOCOL_VERSION, type ServerMessage } from '@aglaea/shared';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';

import { RoomManager } from '../src/room-manager.ts';
import { createRoomRoutes } from '../src/routes.ts';
import { createRoomSocketHandlers } from '../src/socket.ts';

afterEach(() => vi.useRealTimers());

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
  test('message and close callbacks may wrap the same connection in different objects', () => {
    const { rooms, room, handlers, hello } = setup();
    const socket = createSocket();
    handlers.message(socket, hello);
    handlers.message({ ...socket }, { type: 'ping', payload: { clientTime: 123 } });
    expect(socket.messages.at(-1)?.type).toBe('pong');
    handlers.close({ ...socket });
    expect(rooms.snapshot(room).members).toHaveLength(0);
  });

  test('heartbeat timeout removes silent clients and broadcasts the updated membership', () => {
    vi.useFakeTimers();
    const { rooms, room, handlers, hello } = setup();
    const owner = createSocket();
    const member = createSocket();
    handlers.message(owner, hello);
    handlers.message(member, {
      type: 'hello',
      payload: { ...hello.payload, clientId: 'member', role: 'member', ownerToken: undefined },
    });
    owner.messages.length = 0;
    vi.advanceTimersByTime(DEFAULT_HEARTBEAT_TIMEOUT_MS - 1);
    handlers.sweep();
    expect(rooms.snapshot(room).members).toHaveLength(2);
    handlers.message(owner, { type: 'ping', payload: { clientTime: Date.now() } });
    vi.advanceTimersByTime(1);
    handlers.sweep();
    expect(member.close).toHaveBeenCalledOnce();
    expect(owner.close).not.toHaveBeenCalled();
    expect(rooms.snapshot(room).members.map(user => user.clientId)).toEqual(['owner']);
    expect(owner.messages.at(-1)).toMatchObject({
      type: 'member-left',
      payload: { member: { clientId: 'member' }, snapshot: { members: [{ clientId: 'owner' }] } },
    });
    handlers.close(member);
    expect(owner.messages.filter(message => message.type === 'member-left')).toHaveLength(1);
  });

  test('keepalive exit is authenticated, broadcast once, and cannot remove a replacement connection', async () => {
    const { rooms, room, handlers, hello } = setup();
    const owner = createSocket();
    const previous = createSocket();
    const current = createSocket();
    handlers.message(owner, hello);

    const memberHello = {
      type: 'hello',
      payload: { ...hello.payload, clientId: 'member', role: 'member', ownerToken: undefined },
    };

    handlers.message(previous, memberHello);
    const oldHello = previous.messages[0]!;
    handlers.message(current, memberHello);
    const newHello = current.messages[0]!;

    if (oldHello.type !== 'hello' || newHello.type !== 'hello') {
      throw new Error('Expected hello');
    }

    const routes = createRoomRoutes(rooms, 'http://localhost:5173', handlers);

    const leave = (connectionToken: string) =>
      routes.handle(
        new Request(`http://localhost/api/rooms/${room.code}/leave`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ connectionToken }),
        }),
      );

    await leave('invalid-token');
    await leave(oldHello.payload.connectionToken);
    expect(rooms.snapshot(room).members).toHaveLength(2);
    expect(current.close).not.toHaveBeenCalled();
    owner.messages.length = 0;
    const response = await leave(newHello.payload.connectionToken);
    expect(response.status).toBe(200);
    expect(current.close).toHaveBeenCalledOnce();
    expect(rooms.snapshot(room).members).toHaveLength(1);
    await leave(newHello.payload.connectionToken);
    handlers.close(current);
    expect(owner.messages.filter(message => message.type === 'member-left')).toHaveLength(1);
  });

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
