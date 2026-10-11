import {
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  DEFAULT_HEARTBEAT_TIMEOUT_MS,
  type ClientMessage,
  type ServerMessage,
} from '@aglaea/shared';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { createRenderer } from 'vue';

import { useRoomSocket } from '../src/composables/useRoomSocket.ts';

class Socket extends EventTarget {
  static OPEN = 1;

  static instances: Socket[] = [];

  readyState = 1;

  messages: ClientMessage[] = [];

  close = vi.fn();

  constructor(_url: string) {
    super();
    Socket.instances.push(this);
  }

  send(data: string): void {
    this.messages.push(JSON.parse(data) as ClientMessage);
  }

  receive(message: ServerMessage): void {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
  }
}

const renderer = createRenderer<object, object>({
  insert: vi.fn(),
  remove: vi.fn(),
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  parentNode: () => null,
  nextSibling: () => null,
  patchProp: vi.fn(),
  setText: vi.fn(),
  setElementText: vi.fn(),
});

let unmount: (() => void) | undefined;

function setup() {
  vi.useFakeTimers();
  vi.stubGlobal('WebSocket', Socket);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => Promise.resolve(Response.json({ ok: true }))),
  );
  const page = new EventTarget();
  vi.stubGlobal('window', page);
  let client!: ReturnType<typeof useRoomSocket>;

  const app = renderer.createApp({
    setup() {
      client = useRoomSocket({
        serverUrl: 'https://sync.example',
        roomCode: 'AAAAAA',
        clientId: 'remote',
        name: 'Remote',
        role: 'controller',
        kind: 'remote',
        controllerToken: 'controller-token',
      });

      return () => null;
    },
  });

  app.mount({});
  unmount = () => app.unmount();
  client.connect();
  const socket = Socket.instances.at(-1)!;
  socket.dispatchEvent(new Event('open'));
  socket.receive({
    type: 'hello',
    payload: {
      protocolVersion: 1,
      connectionToken: 'connection-token',
      you: { clientId: 'remote', name: 'Remote', role: 'controller', kind: 'remote', joinedAt: 0 },
      snapshot: {
        roomCode: 'AAAAAA',
        round: 0,
        members: [],
        media: { platform: 'bilibili' },
        updatedAt: Date.now(),
        playback: {
          position: 0,
          duration: 100,
          paused: true,
          playbackRate: 1,
          updatedAt: Date.now(),
          serverClock: Date.now(),
        },
      },
    },
  });

  return { client, socket, page };
}

afterEach(() => {
  unmount?.();
  unmount = undefined;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Socket.instances = [];
});

test('pagehide leaves once with keepalive and does not reconnect after close', async () => {
  const { client, socket, page } = setup();
  page.dispatchEvent(new Event('pagehide'));
  expect(client.connected.value).toBe(false);
  expect(socket.messages.at(-1)).toEqual({ type: 'leave', payload: {} });
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  expect(fetch).toHaveBeenCalledExactlyOnceWith('https://sync.example/api/rooms/AAAAAA/leave', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ connectionToken: 'connection-token' }),
    keepalive: true,
  });
  socket.dispatchEvent(new Event('close'));
  page.dispatchEvent(new Event('pagehide'));
  vi.advanceTimersByTime(DEFAULT_HEARTBEAT_TIMEOUT_MS);
  expect(fetch).toHaveBeenCalledOnce();
  expect(Socket.instances).toHaveLength(1);
});

test('a cached page reconnects on restore and unmount removes its lifecycle listeners', () => {
  const { page, socket } = setup();
  page.dispatchEvent(new Event('pagehide'));
  page.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
  expect(Socket.instances).toHaveLength(2);
  expect(socket.close).toHaveBeenCalledOnce();
  unmount?.();
  unmount = undefined;
  page.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
  expect(Socket.instances).toHaveLength(2);
});

test('pong replies keep the page connected and missing replies trigger reconnection', () => {
  const { socket } = setup();

  for (let index = 0; index < 8; index += 1) {
    vi.advanceTimersByTime(DEFAULT_HEARTBEAT_INTERVAL_MS);
    socket.receive({
      type: 'pong',
      payload: { clientTime: Date.now(), serverTime: Date.now(), roomRound: 0 },
    });
  }

  expect(Socket.instances).toHaveLength(1);
  vi.advanceTimersByTime(DEFAULT_HEARTBEAT_TIMEOUT_MS);
  expect(Socket.instances).toHaveLength(2);
  expect(socket.close).toHaveBeenCalledOnce();
});
