import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';

import background from '../entrypoints/background.ts';
import type { ExtensionRequest, ExtensionResponse } from '../src/messaging.ts';

const mocks = vi.hoisted(() => ({
  addListener: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  sendMessage: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  tabRemoved: vi.fn(),
  windowGet: vi.fn(),
  windowUpdate: vi.fn(),
  tabSend: vi.fn(),
  tabCreate: vi.fn(),
  handlers: vi.fn(),
  playerSnapshot: vi.fn(),
  playerUpdate: vi.fn(),
}));

vi.mock('wxt/utils/define-background', () => ({
  defineBackground: (options: { main: () => void }) => options,
}));
vi.mock('wxt/browser', () => ({
  browser: {
    storage: { local: { get: mocks.get, set: mocks.set } },
    runtime: { onMessage: { addListener: mocks.addListener }, sendMessage: mocks.sendMessage },
    tabs: {
      query: mocks.query,
      sendMessage: mocks.tabSend,
      create: mocks.tabCreate,
      onRemoved: { addListener: mocks.tabRemoved },
    },
    windows: { get: mocks.windowGet, update: mocks.windowUpdate },
  },
}));
vi.mock('../src/room-client.ts', () => ({
  RoomClient: class {
    constructor(_config: unknown, _id: string, handlers: unknown) {
      mocks.handlers(handlers);
    }

    connect() {
      mocks.connect();
    }

    disconnect() {
      mocks.disconnect();
    }

    setPlayerSnapshot(snapshot: unknown) {
      mocks.playerSnapshot(snapshot);
    }

    sendPlayerUpdate(source: unknown) {
      mocks.playerUpdate(source);
    }

    clearPlayerSnapshot() {}

    getClockOffsetMs() {
      return 0;
    }
  },
}));

function request(message: ExtensionRequest, tabId?: number): Promise<ExtensionResponse> {
  const listener = mocks.addListener.mock.calls[0]![0] as (
    message: ExtensionRequest,
    sender: object,
    respond: (response: ExtensionResponse) => void,
  ) => boolean;

  return new Promise(resolve => {
    expect(listener(message, tabId === undefined ? {} : { tab: { id: tabId } }, resolve)).toBe(
      true,
    );
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockResolvedValue({ config: { serverUrl: 'https://sync.example', name: 'Alice' } });
  mocks.set.mockResolvedValue(undefined);
  mocks.sendMessage.mockResolvedValue(undefined);
  mocks.query.mockResolvedValue([]);
  mocks.tabSend.mockResolvedValue({ ok: true });
  mocks.windowGet.mockResolvedValue({ state: 'maximized' });
  mocks.windowUpdate.mockResolvedValue(undefined);
  background.main();
});

afterEach(() => vi.unstubAllGlobals());

test('responds with loaded config and retains logs when the popup requests state again', async () => {
  const initial = await request({ type: 'get-state' });
  expect(initial.state.config.name).toBe('Alice');
  expect(initial.state.logs).toHaveLength(1);
  await request({ type: 'save-config', config: { name: 'Bob' } });
  const reopened = await request({ type: 'get-state' });
  expect(reopened.state.logs?.at(-1)).toMatchObject({
    level: 'success',
    message: '服务器和显示名称已保存',
  });
});

test('closing the bound playback tab leaves the room while closing other tabs does not', async () => {
  mocks.query.mockResolvedValue([{ id: 7, url: 'https://www.bilibili.com/video/BVtest/' }]);
  await request({ type: 'bind-player-tab', tabId: 7 });
  await request({ type: 'join-room', roomCode: 'AAAAAA' });
  const removed = mocks.tabRemoved.mock.calls[0]![0] as (tabId: number) => void;
  removed(8);
  expect((await request({ type: 'get-state' })).state.config.roomCode).toBe('AAAAAA');
  expect(mocks.disconnect).not.toHaveBeenCalled();
  removed(7);
  const result = await request({ type: 'get-state' });
  expect(mocks.disconnect).toHaveBeenCalledOnce();
  expect(result.state).toMatchObject({ role: 'none', status: 'idle' });
  expect(result.state.config.roomCode).toBeUndefined();
  expect(result.state.playerTabId).toBeUndefined();
});

test('keeps only the latest 100 events', async () => {
  for (let index = 0; index < 105; index++) {
    await request({ type: 'room-notice', message: `Event ${index}` });
  }

  const response = await request({ type: 'get-state' });
  expect(response.state.logs).toHaveLength(100);
  expect(response.state.logs?.[0]?.message).toBe('Event 5');
  expect(response.state.logs?.at(-1)?.message).toBe('Event 104');
});

test('records failed room creation and warns when no page can receive controls', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Server unavailable')));
  const failed = await request({ type: 'create-room' });
  expect(failed.state.logs?.at(-1)).toMatchObject({
    level: 'error',
    message: 'Server unavailable',
  });
  const control = await request({ type: 'execute-control', action: { type: 'pause' } });
  expect(control.state.logs?.at(-1)?.level).toBe('error');
});

test('restores the room, owner role and remote link when the service worker restarts', async () => {
  await request({ type: 'get-state' });
  mocks.addListener.mockClear();
  mocks.get.mockResolvedValue({
    config: {
      serverUrl: 'https://sync.example',
      name: 'Alice',
      roomCode: 'AAAAAA',
      ownerToken: 'owner',
    },
    clientId: 'stable-client',
    controlUrl: 'https://remote.example/remote.html?token=stable',
  });
  background.main();
  const response = await request({ type: 'get-state' });
  expect(response.state.role).toBe('owner');
  expect(response.state.controlUrl).toContain('token=stable');
  expect(mocks.connect).toHaveBeenCalledOnce();
});

test('fullscreen controls only the explicitly requested page without changing the browser window', async () => {
  mocks.query.mockResolvedValue([
    { id: 7, active: true, windowId: 3, url: 'https://www.bilibili.com/video/BVtest/' },
  ]);
  await request({ type: 'bind-player-tab', tabId: 7 });
  await request({ type: 'execute-control', action: { type: 'fullscreen', enabled: true } }, 7);
  expect(mocks.tabSend).toHaveBeenCalledWith(
    7,
    expect.objectContaining({ type: 'aglaea:execute-control' }),
  );
  await request({ type: 'execute-control', action: { type: 'fullscreen', enabled: false } }, 7);
  expect(mocks.windowUpdate).not.toHaveBeenCalled();
  expect(mocks.set.mock.calls.some(([value]) => value.fullscreen === true)).toBe(false);
});

test('does not restore persisted fullscreen or send controls to another active tab', async () => {
  await request({ type: 'get-state' });
  mocks.addListener.mockClear();
  mocks.get.mockResolvedValue({
    config: { serverUrl: 'https://sync.example', name: 'Alice', roomCode: 'AAAAAA' },
    clientId: 'stable',
    playerTabId: 7,
    fullscreen: true,
  });
  background.main();
  const loaded = await request({ type: 'get-state' });
  expect(loaded.state).not.toHaveProperty('fullscreen');
  mocks.query.mockResolvedValue([
    { id: 8, active: true, windowId: 3, url: 'https://www.bilibili.com/video/BVother/' },
  ]);

  const failed = await request({
    type: 'execute-control',
    action: { type: 'fullscreen', enabled: true },
  });

  expect(failed.state.lastError).toContain('未找到');
  expect(
    mocks.tabSend.mock.calls.some(([, message]) => message.type === 'aglaea:execute-control'),
  ).toBe(false);
  expect(mocks.windowUpdate).not.toHaveBeenCalled();
});

test('locks the display name for an active room until leaving', async () => {
  await request({ type: 'get-state' });
  mocks.addListener.mockClear();
  mocks.get.mockResolvedValue({
    config: { serverUrl: 'https://sync.example', name: 'Alice', roomCode: 'AAAAAA' },
    clientId: 'member',
  });
  background.main();
  const locked = await request({ type: 'save-config', config: { name: 'Bob' } });
  expect(locked.state.config.name).toBe('Alice');
  expect(locked.state.lastError).toContain('请先退出房间');
  await request({ type: 'leave-room' });
  const updated = await request({ type: 'save-config', config: { name: 'Bob' } });
  expect(updated.state.config.name).toBe('Bob');
});

test('explicit binding filters playback pages and isolates samples and controls from other tabs', async () => {
  mocks.query.mockResolvedValue([
    { id: 7, title: 'Bound video', url: 'https://www.bilibili.com/video/BVtest/', active: false },
    { id: 8, title: 'Other video', url: 'https://www.bilibili.com/video/BVother/', active: true },
    { id: 9, title: 'Homepage', url: 'https://www.bilibili.com/', active: false },
  ]);
  const listed = await request({ type: 'get-state' });
  expect(listed.tabs?.map(tab => tab.id)).toEqual([7, 8]);
  await request({ type: 'bind-player-tab', tabId: 7 });
  await request({ type: 'join-room', roomCode: 'AAAAAA' });
  expect((await request({ type: 'get-state' }, 7)).state.isBoundPlayer).toBe(true);
  expect((await request({ type: 'get-state' }, 8)).state.isBoundPlayer).toBe(false);

  const snapshot = {
    position: 10,
    duration: 100,
    paused: true,
    playbackRate: 1,
    media: { platform: 'bilibili' as const, url: 'https://www.bilibili.com/video/BVtest/' },
  };

  await request({ type: 'player-snapshot', snapshot }, 8);
  expect(mocks.playerSnapshot).not.toHaveBeenCalled();
  await request({ type: 'player-snapshot', snapshot }, 7);
  expect(mocks.playerSnapshot).toHaveBeenCalledOnce();
  await request({ type: 'execute-control', action: { type: 'fullscreen', enabled: true } });
  expect(
    mocks.tabSend.mock.calls
      .filter(([, message]) => message.type === 'aglaea:execute-control')
      .map(([id]) => id),
  ).toEqual([7]);
  const invalid = await request({ type: 'bind-player-tab', tabId: 9 });
  expect(invalid.state.playerTabId).toBe(7);
  expect(invalid.state.lastError).toContain('播放页面');
});

test('joining waits for room media, then automatically opens and binds it only once', async () => {
  await request({ type: 'join-room', roomCode: 'AAAAAA' });
  const url = 'https://www.bilibili.com/bangumi/play/ep1396637';
  const handlers = mocks.handlers.mock.calls.at(-1)![0];

  const message = {
    type: 'snapshot',
    payload: {
      roomCode: 'AAAAAA',
      round: 1,
      media: { platform: 'bilibili', url: '' },
      members: [],
      updatedAt: 0,
      playback: {
        position: 10,
        duration: 100,
        paused: true,
        playbackRate: 1,
        updatedAt: 0,
        serverClock: 0,
      },
    },
  };

  handlers.onMessage(message);
  expect(mocks.tabCreate).not.toHaveBeenCalled();
  mocks.tabCreate.mockResolvedValue({ id: 12, url });
  message.payload.media.url = url;
  handlers.onMessage(message);
  handlers.onMessage(message);
  const opened = await request({ type: 'get-state' });
  expect(mocks.tabCreate).toHaveBeenCalledWith({ url, active: true });
  expect(mocks.tabCreate).toHaveBeenCalledOnce();
  expect(opened.state.playerTabId).toBe(12);
  expect((await request({ type: 'get-state' }, 12)).state.isBoundPlayer).toBe(true);
  handlers.onMessage(message);
  expect(mocks.tabCreate).toHaveBeenCalledOnce();
  await request({ type: 'open-room-video' });
  expect(mocks.tabCreate).toHaveBeenCalledTimes(2);
});

test('leaving while waiting for host media cancels automatic video opening', async () => {
  await request({ type: 'join-room', roomCode: 'AAAAAA' });
  const handlers = mocks.handlers.mock.calls.at(-1)![0];
  await request({ type: 'leave-room' });
  handlers.onMessage({
    type: 'snapshot',
    payload: {
      roomCode: 'AAAAAA',
      media: { platform: 'bilibili', url: 'https://www.bilibili.com/video/BVtest/' },
    },
  });
  expect(mocks.tabCreate).not.toHaveBeenCalled();
});
