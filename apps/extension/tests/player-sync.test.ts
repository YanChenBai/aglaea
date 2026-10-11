import type { PlaybackState } from '@aglaea/shared';
import { expect, test, vi } from 'vite-plus/test';

import { applyPlayback } from '../src/player-sync.ts';

function player() {
  return {
    currentTime: 30.4,
    duration: 120,
    paused: false,
    playbackRate: 1,
    readyState: 4,
    pause: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
  };
}

const playback: PlaybackState = {
  position: 30,
  duration: 120,
  paused: true,
  playbackRate: 1,
  updatedAt: 10_000,
  serverClock: 10_000,
};

test('pauses immediately and aligns the stop position even within playing tolerance', async () => {
  const video = player();
  expect(await applyPlayback(video, playback, 12_000)).toBe(true);
  expect(video.pause).toHaveBeenCalledOnce();
  expect(video.currentTime).toBe(30);
  expect(video.play).not.toHaveBeenCalled();
});

test('resumes at the projected server position and applies playback speed', async () => {
  const video = { ...player(), paused: true, currentTime: 0 };
  await applyPlayback(video, { ...playback, paused: false, playbackRate: 2 }, 12_000);
  expect(video.currentTime).toBe(34);
  expect(video.playbackRate).toBe(2);
  expect(video.play).toHaveBeenCalledOnce();
});

test('an explicit seek is followed even when the jump is within drift tolerance', async () => {
  const video = player();
  await applyPlayback(video, { ...playback, paused: false }, 10_000, true);
  expect(video.currentTime).toBe(30);
});

test('waits for metadata and reports autoplay rejection instead of silently failing', async () => {
  const video = { ...player(), paused: true, readyState: 0 };
  expect(await applyPlayback(video, playback, 12_000)).toBe(false);
  expect(video.currentTime).toBe(30.4);
  video.readyState = 4;
  video.play.mockRejectedValue(new Error('Autoplay blocked'));
  await expect(applyPlayback(video, { ...playback, paused: false }, 12_000)).rejects.toThrow(
    'Autoplay blocked',
  );
});
