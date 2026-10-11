import { afterEach, expect, test, vi } from 'vite-plus/test';

import { createPlayerOverlay } from '../src/player-overlay.ts';

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('mounts in the player and fullscreen container, hides when idle and reveals on movement', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('window', new EventTarget());

  const doc = Object.assign(new EventTarget(), {
    fullscreenElement: null as unknown,
    createElement: () => ({ textContent: '' }),
    documentElement: { append: vi.fn() },
  });

  vi.stubGlobal('document', doc);
  vi.stubGlobal('getComputedStyle', () => ({ position: 'relative' }));

  const node = () =>
    Object.assign(new EventTarget(), {
      style: { position: 'relative' },
      tagName: 'DIV',
      append: vi.fn(),
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
      contains: () => true,
      getBoundingClientRect: () => ({ width: 800, height: 450 }),
    });

  const player = node();
  const full = node();
  const host = { style: { right: '16px', top: '64px' } };
  const status = { style: { visibility: '', opacity: '' } };
  const handle = node();
  const button = { contains: () => false };

  const overlay = createPlayerOverlay(
    host as unknown as HTMLElement,
    status as unknown as HTMLElement,
    handle as unknown as HTMLElement,
    button as unknown as HTMLElement,
    () => player as unknown as HTMLElement,
  );

  overlay.update();
  expect(player.append).toHaveBeenCalledWith(host);
  expect(player.style.position).toBe('relative');
  await vi.advanceTimersByTimeAsync(2_500);
  expect(status.style.visibility).toBe('hidden');
  player.dispatchEvent(new Event('pointermove'));
  expect(status.style.visibility).toBe('visible');
  handle.dispatchEvent(new Event('pointerenter'));
  await vi.advanceTimersByTimeAsync(3_000);
  expect(status.style.visibility).toBe('visible');
  doc.fullscreenElement = full;
  doc.dispatchEvent(new Event('fullscreenchange'));
  expect(full.append).toHaveBeenCalledWith(host);
  expect(player.removeAttribute).toHaveBeenCalledWith('data-aglaea-overlay-container');
  doc.fullscreenElement = null;
  doc.dispatchEvent(new Event('fullscreenchange'));
  expect(player.append).toHaveBeenCalledTimes(2);
});
