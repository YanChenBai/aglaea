import { runInNewContext } from 'node:vm';

import type { RoomSnapshot } from '@aglaea/shared';
import { afterEach, expect, test, vi } from 'vite-plus/test';

import { fullscreenScript, playerScript } from '../src/player/browser';
import { isBilibiliUrl, playbackUrl } from '../src/player/navigation';
import { RoomSession, type RoomSocket } from '../src/room/session';

afterEach(() => vi.useRealTimers());

test('only permits Bilibili HTTPS navigation', () => {
  expect(isBilibiliUrl('https://www.bilibili.com/video/BV123?p=2')).toBe(true);
  expect(isBilibiliUrl('https://m.bilibili.com/video/BV123')).toBe(true);
  expect(playbackUrl('https://m.bilibili.com/video/BV123?p=2')).toBe(
    'https://www.bilibili.com/video/BV123?p=2',
  );

  for (const url of [
    'bilibili://video/123',
    'http://www.bilibili.com',
    'https://bilibili.com.evil.test',
    'javascript:alert(1)',
  ]) {
    expect(isBilibiliUrl(url)).toBe(false);
  }
});

test('joins as a member, follows snapshots, and cancels reconnect on leave', () => {
  vi.useFakeTimers();
  const sockets: RoomSocket[] = [];
  const messages: string[] = [];
  const snapshots = vi.fn();

  const makeSocket = vi.fn(() => {
    const socket: RoomSocket = {
      readyState: 1,
      send: message => messages.push(message),
      close: vi.fn(),
    };

    sockets.push(socket);

    return socket;
  });

  const session = new RoomSession(
    { serverUrl: 'http://localhost:8787', roomCode: 'ABCDEF', name: '手机', clientId: 'mobile-1' },
    makeSocket,
    snapshots,
    vi.fn(),
  );

  session.connect();
  sockets[0]!.onopen?.({});
  expect(JSON.parse(messages[0]!)).toMatchObject({
    type: 'hello',
    payload: { role: 'member', kind: 'browser', protocolVersion: 1 },
  });
  const snapshot = { playback: { serverClock: Date.now() } } as RoomSnapshot;
  sockets[0]!.onmessage?.({ data: JSON.stringify({ type: 'hello', payload: { snapshot } }) });
  expect(snapshots).toHaveBeenCalledWith(snapshot);
  sockets[0]!.onclose?.({});
  vi.advanceTimersByTime(1_000);
  expect(makeSocket).toHaveBeenCalledTimes(2);
  sockets[0]!.onmessage?.({ data: JSON.stringify({ type: 'snapshot', payload: snapshot }) });
  expect(snapshots).toHaveBeenCalledTimes(1);
  sockets[1]!.onclose?.({});
  session.disconnect();
  vi.advanceTimersByTime(90_000);
  expect(makeSocket).toHaveBeenCalledTimes(2);
});

test('serialized bridge waits for metadata, follows replacement players, and disposes its timer', async () => {
  let receive: (state: unknown) => void = () => {};

  let tick: () => void = () => {};

  const clear = vi.fn();

  const video = {
    readyState: 0,
    currentTime: 0,
    duration: 120,
    playbackRate: 1,
    paused: true,
    pause: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
  };

  let selected = video;

  const scope = {
    nsWebViewBridge: {
      on: (_name: string, callback: typeof receive) => {
        receive = callback;
      },
      off: vi.fn(),
      emit: vi.fn(),
    },
    aglaeaDispose: undefined as (() => void) | undefined,
    aglaeaAudioFocus: undefined as
      | ((allowed: boolean, locallyPaused?: boolean) => void)
      | undefined,
  };

  runInNewContext(playerScript(), {
    window: scope,
    document: { querySelector: () => selected },
    Date: { now: () => 10_000 },
    setInterval: (callback: () => void) => {
      tick = callback;

      return 1;
    },
    clearInterval: clear,
  });
  scope.aglaeaAudioFocus?.(true);
  receive({
    position: 30,
    paused: false,
    playbackRate: 1.5,
    sentAt: 8_000,
    tolerance: 1.25,
    force: true,
  });
  expect(video.currentTime).toBe(0);
  video.readyState = 4;
  tick();
  await new Promise(resolve => setImmediate(resolve));
  expect(video.currentTime).toBe(33);
  expect(video.play).toHaveBeenCalledOnce();
  expect(video.playbackRate).toBe(1.5);
  selected = { ...video, currentTime: 32.5, paused: false };
  tick();
  await new Promise(resolve => setImmediate(resolve));
  expect(selected.currentTime).toBe(33);
  selected.currentTime = 34.6;
  receive({
    position: 35,
    paused: true,
    playbackRate: 1,
    sentAt: 10_000,
    tolerance: 1.25,
    force: false,
  });
  await new Promise(resolve => setImmediate(resolve));
  expect(selected.currentTime).toBe(35);
  expect(selected.pause).toHaveBeenCalledOnce();
  scope.aglaeaAudioFocus?.(false);
  expect(selected.pause.mock.calls.length).toBeGreaterThan(1);
  scope.aglaeaAudioFocus?.(false, true);
  receive({
    position: 40,
    paused: false,
    playbackRate: 1,
    sentAt: 10_000,
    tolerance: 1.25,
    force: false,
  });
  await new Promise(resolve => setImmediate(resolve));
  tick();
  await new Promise(resolve => setImmediate(resolve));
  expect(scope.nsWebViewBridge.emit).toHaveBeenCalledWith('aglaeaStatus', {
    message: '已暂停本机，可从媒体卡片继续跟随',
  });
  scope.aglaeaDispose?.();
  expect(clear).toHaveBeenCalledWith(1);
});

test('room notices report membership and errors without turning sync ticks into messages', () => {
  vi.useFakeTimers();
  const socket: RoomSocket = { readyState: 1, send: vi.fn(), close: vi.fn() };
  const notices = vi.fn();

  const session = new RoomSession(
    { serverUrl: 'http://localhost:8787', roomCode: 'ABCDEF', name: '手机', clientId: 'mobile' },
    () => socket,
    vi.fn(),
    vi.fn(),
    notices,
  );

  const snapshot = { playback: { serverClock: Date.now() } } as RoomSnapshot;
  const receive = (value: unknown) => socket.onmessage?.({ data: JSON.stringify(value) });
  session.connect();
  receive({ type: 'hello', payload: { snapshot } });
  expect(session.connected).toBe(true);
  receive({ type: 'sync', payload: snapshot });
  receive({ type: 'member-joined', payload: { snapshot, member: { name: '朋友' } } });
  receive({ type: 'member-left', payload: { snapshot, member: { name: '朋友' } } });
  receive({ type: 'error', payload: { code: 'ROOM_CLOSED', message: '房间已关闭' } });
  expect(notices.mock.calls).toEqual([
    ['已加入房间', 'success'],
    ['朋友 加入了房间', 'info'],
    ['朋友 离开了房间', 'warning'],
    ['房间已关闭', 'error'],
  ]);
  expect(session.connected).toBe(false);
  receive({ type: 'member-joined', payload: { snapshot, member: { name: '旧连接' } } });
  expect(notices).toHaveBeenCalledTimes(4);
});

test('serialized fullscreen control follows player state and reports a missing button', () => {
  let entered = false;

  const button = {
    classList: { contains: () => entered },
    click: vi.fn(() => {
      entered = !entered;
    }),
  };

  const context = { document: { querySelector: () => ({ querySelector: () => button }) } };
  expect(runInNewContext(fullscreenScript(true), context)).toBe(true);
  runInNewContext(fullscreenScript(true), context);
  expect(button.click).toHaveBeenCalledOnce();
  entered = false;
  expect(runInNewContext(fullscreenScript(), context)).toBe(true);
  expect(runInNewContext(fullscreenScript(false), context)).toBe(false);
  expect(() =>
    runInNewContext(fullscreenScript(), { document: { querySelector: () => null } }),
  ).toThrow('网页全屏按钮');
});
