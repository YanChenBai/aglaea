import { afterEach, expect, test, vi } from 'vite-plus/test';

import { enableOverlayDrag } from '../src/overlay-drag.ts';

afterEach(() => vi.unstubAllGlobals());

test('drags the overlay within the viewport, excludes sync clicks, and clamps on resize', () => {
  const viewport = Object.assign(new EventTarget(), { innerWidth: 1000, innerHeight: 700 });
  vi.stubGlobal('window', viewport);
  const host = { style: { right: '20px', top: '64px' } };

  const handle = Object.assign(new EventTarget(), {
    style: { cursor: 'grab' },
    getBoundingClientRect: () => ({ width: 200, height: 34, right: 980, bottom: 604 }),
    setPointerCapture: vi.fn(),
    hasPointerCapture: () => true,
    releasePointerCapture: vi.fn(),
  });

  const button = { contains: vi.fn(() => false) };
  enableOverlayDrag(
    host as unknown as HTMLElement,
    handle as unknown as HTMLElement,
    button as unknown as HTMLElement,
  );

  const pointer = (type: string, x: number, y: number) =>
    handle.dispatchEvent(
      Object.assign(new Event(type), {
        isPrimary: true,
        button: 0,
        pointerId: 1,
        clientX: x,
        clientY: y,
      }),
    );

  pointer('pointerdown', 900, 580);
  pointer('pointermove', 800, 680);
  expect(host.style).toEqual({ right: '120px', top: '164px' });
  pointer('pointermove', -1000, -1000);
  expect(host.style).toEqual({ right: '788px', top: '64px' });
  pointer('pointermove', -1000, 2000);
  expect(host.style).toEqual({ right: '788px', top: '654px' });
  pointer('pointerup', -1000, -1000);
  expect(handle.style.cursor).toBe('grab');
  expect(handle.releasePointerCapture).toHaveBeenCalledWith(1);
  viewport.innerWidth = 500;
  viewport.innerHeight = 300;
  viewport.dispatchEvent(new Event('resize'));
  expect(host.style).toEqual({ right: '288px', top: '254px' });
  button.contains.mockReturnValue(true);
  pointer('pointerdown', 900, 580);
  pointer('pointermove', 800, 480);
  expect(handle.setPointerCapture).toHaveBeenCalledTimes(1);
  expect(host.style).toEqual({ right: '288px', top: '254px' });
});
