import { DEFAULT_SYNC_INTERVAL_MS } from '@aglaea/shared';
import { afterEach, expect, test, vi } from 'vite-plus/test';

import content from '../entrypoints/content.ts';
import type { ExtensionRequest, ExtensionState } from '../src/messaging.ts';

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  addListener: vi.fn(),
  fullscreen: vi.fn(),
}));

vi.mock('../src/player-fullscreen.ts', () => ({ createPlayerFullscreen: () => mocks.fullscreen }));
vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { sendMessage: mocks.sendMessage, onMessage: { addListener: mocks.addListener } },
  },
}));
vi.mock('wxt/utils/define-content-script', () => ({
  defineContentScript: (options: unknown) => options,
}));

class Video extends EventTarget {
  currentTime = 30.4;

  duration = 120;

  paused = false;

  playbackRate = 1;

  readyState = 4;

  muted = false;

  pause = vi.fn(() => {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  });

  play = vi.fn(async () => {
    this.paused = false;
  });
}

function setup(role: 'owner' | 'member') {
  vi.useFakeTimers();
  mocks.sendMessage.mockReset();
  mocks.addListener.mockReset();
  mocks.fullscreen.mockReset();
  mocks.fullscreen.mockImplementation((enabled?: boolean) => enabled !== false);
  const video = new Video();
  let currentVideo = video;
  const nodes: (EventTarget & { title?: string; disabled?: boolean })[] = [];

  const node = () =>
    Object.assign(new EventTarget(), {
      style: {},
      append: vi.fn(),
      remove: vi.fn(),
      textContent: '',
      innerHTML: '',
      className: '',
      id: '',
      setAttribute: vi.fn(),
    });

  const shadow = { innerHTML: '', querySelector: () => node() };
  const navigate = vi.fn();
  vi.stubGlobal('document', {
    addEventListener: vi.fn(),
    title: 'Test video',
    documentElement: node(),
    createElement: () => {
      const element = Object.assign(node(), { attachShadow: () => shadow });
      nodes.push(element);

      return element;
    },
    querySelector: (selector: string) => (selector === 'video' ? currentVideo : undefined),
  });
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('location', {
    href: 'https://www.bilibili.com/video/BVtest?p=1',
    pathname: '/video/BVtest',
    search: '?p=1',
    assign: navigate,
  });
  vi.stubGlobal(
    'MutationObserver',
    class {
      observe(): void {}
    },
  );

  const state: ExtensionState = {
    config: { serverUrl: 'http://localhost:8787', name: 'Test', roomCode: 'AAAAAA' },
    status: 'connected',
    role,
    isBoundPlayer: true,
    clockOffsetMs: 0,
    snapshot: {
      roomCode: 'AAAAAA',
      round: 1,
      media: {
        platform: 'bilibili',
        bvid: 'BVtest',
        episodeIndex: 0,
        url: 'https://www.bilibili.com/video/BVtest?p=1',
      },
      members: [],
      updatedAt: Date.now(),
      playback: {
        position: 30,
        duration: 120,
        paused: false,
        playbackRate: 1,
        updatedAt: Date.now(),
        serverClock: Date.now(),
      },
    },
  };

  mocks.sendMessage.mockImplementation(async (_message: ExtensionRequest) => ({ state }));
  content.main({} as NonNullable<Parameters<typeof content.main>[0]>);

  const receive = mocks.addListener.mock.calls[0]![0] as (
    message: unknown,
    sender?: unknown,
    respond?: (response: { ok: boolean; error?: string }) => void,
  ) => boolean | undefined;

  return {
    video,
    state,
    receive,
    navigate,
    syncButton: nodes.find(node => node.title === '手动同步')!,
    replaceVideo: (next: Video) => {
      currentVideo = next;
    },
  };
}

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('only explicit player controls enter fullscreen, never room state updates', async () => {
  const { state, receive } = setup('member');
  await vi.advanceTimersByTimeAsync(0);
  receive({ type: 'aglaea:state', state: { ...state, fullscreen: true } });
  expect(mocks.fullscreen).not.toHaveBeenCalled();

  const result = await new Promise<{ ok: boolean }>(resolve => {
    receive(
      { type: 'aglaea:execute-control', payload: { type: 'fullscreen', enabled: true } },
      {},
      resolve,
    );
  });

  expect(result.ok).toBe(true);
  expect(mocks.fullscreen).toHaveBeenCalledExactlyOnceWith(true);
  receive({ type: 'aglaea:state', state });
  expect(mocks.fullscreen).toHaveBeenCalledTimes(1);
});

test('passes web fullscreen toggles to the player without forcing entry', async () => {
  const { receive } = setup('member');
  await vi.advanceTimersByTimeAsync(0);

  for (let index = 0; index < 2; index += 1) {
    const result = await new Promise<{ ok: boolean }>(resolve => {
      receive({ type: 'aglaea:execute-control', payload: { type: 'fullscreen' } }, {}, resolve);
    });

    expect(result.ok).toBe(true);
  }

  expect(mocks.fullscreen.mock.calls).toEqual([[undefined], [undefined]]);
});

test('unbound pages neither follow room playback nor upload samples or execute controls', async () => {
  const { state, video, receive, navigate } = setup('member');
  await vi.advanceTimersByTimeAsync(0);
  state.isBoundPlayer = false;
  state.snapshot!.media.url = 'https://www.bilibili.com/bangumi/play/ep1396637';
  state.snapshot!.round += 1;
  video.currentTime = 88;
  mocks.sendMessage.mockClear();
  receive({ type: 'aglaea:state', state });
  video.dispatchEvent(new Event('seeked'));
  await vi.advanceTimersByTimeAsync(DEFAULT_SYNC_INTERVAL_MS);
  expect(video.currentTime).toBe(88);
  expect(navigate).not.toHaveBeenCalled();
  expect(
    mocks.sendMessage.mock.calls.some(
      ([message]) => message.type === 'player-snapshot' || message.type === 'player-event',
    ),
  ).toBe(false);

  const result = await new Promise<{ ok: boolean }>(resolve =>
    receive(
      { type: 'aglaea:execute-control', payload: { type: 'fullscreen', enabled: true } },
      {},
      resolve,
    ),
  );

  expect(result.ok).toBe(false);
  expect(mocks.fullscreen).not.toHaveBeenCalled();
});

test('a bound member follows a bangumi episode using its original playback URL', async () => {
  const { state, receive, navigate } = setup('member');
  await vi.advanceTimersByTimeAsync(0);
  const url = 'https://www.bilibili.com/bangumi/play/ep1396637';
  state.snapshot!.media = { platform: 'bilibili', url, bvid: 'BVunderlying' };
  state.snapshot!.round += 1;
  receive({ type: 'aglaea:state', state });
  expect(navigate).toHaveBeenCalledWith(url);
});

test('the persistent floating sync button requests manual alignment and disables while disconnected', async () => {
  const { syncButton, state, receive } = setup('member');
  await vi.advanceTimersByTimeAsync(0);
  expect(syncButton.disabled).toBe(false);
  mocks.sendMessage.mockClear();
  syncButton.dispatchEvent(new Event('click'));
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.sendMessage).toHaveBeenCalledWith({
    type: 'execute-control',
    action: { type: 'resync' },
  });
  state.status = 'connecting';
  receive({ type: 'aglaea:state', state });
  expect(syncButton.disabled).toBe(true);
});

test('the actual content message listener pauses a member video without echoing a player event', async () => {
  const { video, state, receive } = setup('member');
  await vi.advanceTimersByTimeAsync(0);
  mocks.sendMessage.mockClear();
  const snapshot = state.snapshot!;
  state.snapshot = { ...snapshot, round: 2, playback: { ...snapshot.playback, paused: true } };
  receive({ type: 'aglaea:state', state });
  await vi.advanceTimersByTimeAsync(0);
  expect(video.pause).toHaveBeenCalledOnce();
  expect(video.currentTime).toBe(30);
  expect(mocks.sendMessage.mock.calls.some(([message]) => message.type === 'player-event')).toBe(
    false,
  );
});

test('owner pause is immediate and one fresh sample is sent per interval after replacing the video', async () => {
  const { video, replaceVideo } = setup('owner');
  await vi.advanceTimersByTimeAsync(0);
  mocks.sendMessage.mockClear();
  video.pause();
  expect(mocks.sendMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'player-event',
      source: 'pause',
      snapshot: expect.objectContaining({ paused: true }),
    }),
  );
  await vi.advanceTimersByTimeAsync(0);
  mocks.sendMessage.mockClear();
  await vi.advanceTimersByTimeAsync(DEFAULT_SYNC_INTERVAL_MS);
  expect(
    mocks.sendMessage.mock.calls.filter(([message]) => message.type === 'player-snapshot'),
  ).toHaveLength(1);
  const replacement = new Video();
  replacement.currentTime = 60;
  replaceVideo(replacement);
  await vi.advanceTimersByTimeAsync(DEFAULT_SYNC_INTERVAL_MS);
  mocks.sendMessage.mockClear();
  await vi.advanceTimersByTimeAsync(DEFAULT_SYNC_INTERVAL_MS);

  const samples = mocks.sendMessage.mock.calls.filter(
    ([message]) => message.type === 'player-snapshot',
  );

  expect(samples).toHaveLength(1);
  expect(samples[0]![0].snapshot.position).toBe(60);
  video.pause();
  expect(
    mocks.sendMessage.mock.calls.filter(([message]) => message.type === 'player-event'),
  ).toHaveLength(0);
});

test('manual owner seeking is uploaded immediately and member seeks ignore drift tolerance', async () => {
  const owner = setup('owner');
  await vi.advanceTimersByTimeAsync(0);
  mocks.sendMessage.mockClear();
  owner.video.currentTime = 60;
  owner.video.dispatchEvent(new Event('seeking'));
  expect(mocks.sendMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'player-event',
      source: 'seek',
      snapshot: expect.objectContaining({ position: 60 }),
    }),
  );
  vi.clearAllTimers();
  const member = setup('member');
  await vi.advanceTimersByTimeAsync(0);
  member.state.syncSource = 'seek';
  member.state.snapshot = { ...member.state.snapshot!, round: 2 };
  member.receive({ type: 'aglaea:state', state: member.state });
  await vi.advanceTimersByTimeAsync(0);
  expect(member.video.currentTime).toBe(30);
});

test("manual sync reads and uploads the owner's current player state", async () => {
  const { video, receive } = setup('owner');
  await vi.advanceTimersByTimeAsync(0);
  mocks.sendMessage.mockClear();
  video.currentTime = 72;
  video.paused = true;

  const response = await new Promise<{ ok: boolean; error?: string }>(resolve => {
    receive({ type: 'aglaea:execute-control', payload: { type: 'resync' } }, {}, resolve);
  });

  expect(response.ok).toBe(true);
  expect(mocks.sendMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'player-event',
      source: 'seek',
      snapshot: expect.objectContaining({ position: 72, paused: true }),
    }),
  );
});

test('manual sync forces a member to follow without uploading a playback event', async () => {
  const { video, receive } = setup('member');
  await vi.advanceTimersByTimeAsync(0);
  mocks.sendMessage.mockClear();
  video.currentTime = 30.8;

  const response = await new Promise<{ ok: boolean; error?: string }>(resolve => {
    receive({ type: 'aglaea:execute-control', payload: { type: 'resync' } }, {}, resolve);
  });

  expect(response.ok).toBe(true);
  expect(video.currentTime).toBe(30);
  expect(mocks.sendMessage.mock.calls.some(([message]) => message.type === 'player-event')).toBe(
    false,
  );
  video.readyState = 0;

  const unavailable = await new Promise<{ ok: boolean; error?: string }>(resolve => {
    receive({ type: 'aglaea:execute-control', payload: { type: 'resync' } }, {}, resolve);
  });

  expect(unavailable).toEqual({ ok: false, error: '播放器尚未就绪' });
});
