import { afterEach, expect, test, vi } from 'vite-plus/test';

import { createPlayerFullscreen } from '../src/player-fullscreen.ts';

afterEach(() => vi.unstubAllGlobals());

function setup(entered = false) {
  const web = {
    classList: { contains: () => entered },
    click: vi.fn(() => {
      entered = !entered;
    }),
  };

  const native = { click: vi.fn() };

  const player = {
    querySelector: (selector: string) => (selector === '.bpx-player-ctrl-web' ? web : native),
    requestFullscreen: vi.fn(),
  };

  const doc = {
    fullscreenElement: null as unknown,
    querySelector: () => player,
    exitFullscreen: vi.fn(),
  };

  vi.stubGlobal('navigator', { userActivation: { isActive: true } });
  vi.stubGlobal('document', doc);

  return { web, native, player, doc };
}

test('repeated remote controls toggle web fullscreen without invoking native fullscreen', () => {
  const { web, native, player, doc } = setup();
  const fullscreen = createPlayerFullscreen();
  expect(fullscreen()).toBe(true);
  expect(fullscreen()).toBe(false);
  expect(fullscreen()).toBe(true);
  expect(web.click).toHaveBeenCalledTimes(3);
  expect(native.click).not.toHaveBeenCalled();
  expect(player.requestFullscreen).not.toHaveBeenCalled();
  expect(doc.exitFullscreen).not.toHaveBeenCalled();
});

test('a new remote control re-enters fullscreen after the user exits with the player button', () => {
  const { web } = setup();
  const fullscreen = createPlayerFullscreen();
  fullscreen();
  web.click();
  expect(fullscreen()).toBe(true);
  expect(web.click).toHaveBeenCalledTimes(3);
  fullscreen(false);
  expect(web.click).toHaveBeenCalledTimes(4);
  fullscreen(false);
  expect(web.click).toHaveBeenCalledTimes(4);
});

test('explicit entry is idempotent and cleanup does not reopen a manually exited session', () => {
  const { web } = setup();
  const fullscreen = createPlayerFullscreen();
  fullscreen(true);
  fullscreen(true);
  expect(web.click).toHaveBeenCalledOnce();
  web.click();
  fullscreen(false);
  expect(web.click).toHaveBeenCalledTimes(2);
});

test('cleanup preserves user fullscreen while an explicit toggle can exit it', () => {
  const { web } = setup(true);
  const fullscreen = createPlayerFullscreen();
  fullscreen(true);
  fullscreen(false);
  expect(web.click).not.toHaveBeenCalled();
  expect(fullscreen()).toBe(false);
  expect(web.click).toHaveBeenCalledOnce();
});

test('does not disturb an existing native fullscreen session', () => {
  const { web, doc } = setup();
  doc.fullscreenElement = {};
  expect(createPlayerFullscreen()()).toBe(false);
  expect(web.click).not.toHaveBeenCalled();
});

test('reports a missing web fullscreen button', () => {
  const { player } = setup();
  player.querySelector = () => null as never;
  expect(() => createPlayerFullscreen()(true)).toThrow('未找到播放器的网页全屏按钮');
  expect(player.requestFullscreen).not.toHaveBeenCalled();
});
