import { describe, expect, test } from 'vite-plus/test';

import { decideSync, makeRoomCode, projectPlayback } from '../src/index.ts';

describe('sync helpers', () => {
  test('projects paused playback without advancing', () => {
    expect(
      projectPlayback({ position: 30, duration: 100, paused: true, playbackRate: 1 }, 5_000),
    ).toBe(30);
  });

  test('projects running playback with playback rate', () => {
    expect(
      projectPlayback({ position: 30, duration: 100, paused: false, playbackRate: 1.5 }, 2_000),
    ).toBe(33);
  });

  test('only requests a seek when drift exceeds tolerance', () => {
    const withinTolerance = decideSync(
      30.2,
      { position: 30, duration: 100, paused: true, playbackRate: 1 },
      0,
      1.25,
    );

    const outsideTolerance = decideSync(
      20,
      { position: 30, duration: 100, paused: true, playbackRate: 1 },
      0,
      1.25,
    );

    expect(withinTolerance.shouldSeek).toBe(false);
    expect(outsideTolerance.shouldSeek).toBe(true);
    expect(outsideTolerance.targetPosition).toBe(30);
  });

  test('generates unambiguous room codes', () => {
    expect(makeRoomCode(() => 0)).toBe('AAAAAA');
    expect(makeRoomCode(() => 0.999_999)).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});
