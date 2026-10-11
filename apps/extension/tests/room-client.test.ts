import {
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  DEFAULT_HEARTBEAT_TIMEOUT_MS,
  DEFAULT_SYNC_INTERVAL_MS,
  type ClientMessage,
  type ServerMessage,
} from '@aglaea/shared';
import { afterEach, expect, test, vi } from 'vite-plus/test';

import type { PlayerSnapshot } from '../src/messaging.ts';
import { RoomClient } from '../src/room-client.ts';

class Socket extends EventTarget {
  static OPEN = 1;

  static instances: Socket[] = [];

  readyState = 1;

  messages: ClientMessage[] = [];

  constructor(_url: string) {
    super();
    Socket.instances.push(this);
  }

  send(data: string): void {
    this.messages.push(JSON.parse(data) as ClientMessage);
  }

  close(): void {}

  receive(message: ServerMessage): void {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
  }
}

const snapshot: PlayerSnapshot = {
  position: 42,
  duration: 120,
  paused: true,
  playbackRate: 1,
  media: { platform: 'bilibili', url: 'https://www.bilibili.com/video/BVtest' },
};

function connect(owner: boolean) {
  vi.useFakeTimers();
  vi.stubGlobal('WebSocket', Socket);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

  const client = new RoomClient(
    {
      serverUrl: 'http://localhost:8787',
      name: 'Test',
      roomCode: 'AAAAAA',
      ownerToken: owner ? 'owner' : undefined,
    },
    'client',
    { onStatus: vi.fn(), onMessage: vi.fn() },
  );

  client.connect();
  const socket = Socket.instances.at(-1)!;
  socket.dispatchEvent(new Event('open'));
  socket.receive({
    type: 'hello',
    payload: {
      protocolVersion: 1,
      connectionToken: 'connection-token',
      you: {
        clientId: 'client',
        name: 'Test',
        role: owner ? 'owner' : 'member',
        kind: 'browser',
        joinedAt: Date.now(),
      },
      snapshot: {
        roomCode: 'AAAAAA',
        round: 0,
        media: snapshot.media,
        members: [],
        updatedAt: Date.now(),
        playback: { ...snapshot, updatedAt: Date.now(), serverClock: Date.now() },
      },
    },
  });

  return { client, socket };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Socket.instances = [];
});

test('uploads the current owner sample and pause event immediately without an independent upload timer', () => {
  const { client, socket } = connect(true);
  client.setPlayerSnapshot(snapshot);
  client.sendPlayerUpdate('pause');
  expect(socket.messages.at(-1)).toMatchObject({
    type: 'sync',
    payload: { paused: true, position: 42, source: 'pause' },
  });
  const count = socket.messages.filter(message => message.type === 'sync').length;
  vi.advanceTimersByTime(DEFAULT_SYNC_INTERVAL_MS * 3);
  expect(socket.messages.filter(message => message.type === 'sync')).toHaveLength(count);
  client.setPlayerSnapshot({ ...snapshot, position: 50 });
  client.sendPlayerUpdate('tick');
  expect(socket.messages.at(-1)).toMatchObject({ type: 'sync', payload: { position: 50 } });
  client.disconnect();
});

test("never uploads member samples or playback events over the owner's state", () => {
  const { client, socket } = connect(false);
  client.setPlayerSnapshot(snapshot);
  client.sendPlayerUpdate('tick');
  client.sendPlayerUpdate('pause');
  expect(socket.messages.some(message => message.type === 'sync')).toBe(false);
  client.disconnect();
});

test('reconnects after a dropped socket and explicit disconnect cancels retries', () => {
  expect(DEFAULT_SYNC_INTERVAL_MS).toBe(1_000);
  const { client, socket } = connect(true);
  socket.dispatchEvent(new Event('close'));
  vi.advanceTimersByTime(1_000);
  expect(Socket.instances).toHaveLength(2);
  const replacement = Socket.instances.at(-1)!;
  replacement.dispatchEvent(new Event('open'));
  expect(replacement.messages[0]).toMatchObject({
    type: 'hello',
    payload: { roomCode: 'AAAAAA', ownerToken: 'owner' },
  });
  client.disconnect();
  replacement.dispatchEvent(new Event('close'));
  vi.advanceTimersByTime(20_000);
  expect(Socket.instances).toHaveLength(2);
});

test('heartbeats stay connected with pong replies and reconnect after the server stops responding', () => {
  const { client, socket } = connect(false);

  for (let index = 0; index < 8; index += 1) {
    vi.advanceTimersByTime(DEFAULT_HEARTBEAT_INTERVAL_MS);
    const ping = socket.messages.at(-1)!;
    expect(ping.type).toBe('ping');

    if (ping.type === 'ping') {
      socket.receive({
        type: 'pong',
        payload: { clientTime: ping.payload.clientTime, serverTime: Date.now(), roomRound: 0 },
      });
    }
  }

  expect(Socket.instances).toHaveLength(1);
  vi.advanceTimersByTime(DEFAULT_HEARTBEAT_TIMEOUT_MS);
  expect(Socket.instances).toHaveLength(2);
  client.disconnect();
});

test('explicit disconnect sends leave and a keepalive request for only the current connection', () => {
  const { client, socket } = connect(false);
  client.disconnect();
  expect(socket.messages.at(-1)).toEqual({ type: 'leave', payload: {} });
  expect(fetch).toHaveBeenCalledExactlyOnceWith('http://localhost:8787/api/rooms/AAAAAA/leave', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ connectionToken: 'connection-token' }),
    keepalive: true,
  });
  client.disconnect();
  expect(fetch).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(DEFAULT_HEARTBEAT_TIMEOUT_MS);
  expect(Socket.instances).toHaveLength(1);
});
