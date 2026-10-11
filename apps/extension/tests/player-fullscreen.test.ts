import { afterEach, expect, test, vi } from 'vite-plus/test';

import { createPlayerFullscreen } from '../src/player-fullscreen.ts';

afterEach(() => vi.unstubAllGlobals());

function setup(entered = false, active = false) {
  const web = {
    classList: { contains: () => entered },
    click: vi.fn(() => {
      entered = !entered;
    }),
  };

  const native = { click: vi.fn() };

  const player = {
    querySelector: (selector: string) => (selector === '.bpx-player-ctrl-web' ? web : native),
    contains: (element: unknown) => element === player,
  };

  const doc = {
    fullscreenElement: null as unknown,
    querySelector: () => player,
    exitFullscreen: vi.fn(async () => {}),
    createElement: vi.fn(),
    body: { style: { overflow: 'auto' } },
  };

  vi.stubGlobal('navigator', { userActivation: { isActive: active } });
  vi.stubGlobal('document', doc);

  return { web, native, player, doc };
}

test("remote fullscreen uses Bilibili's web control without overriding layout", () => {
  const { web, native, doc } = setup();
  const fullscreen = createPlayerFullscreen();
  fullscreen(true);
  fullscreen(true);
  expect(web.click).toHaveBeenCalledTimes(1);
  expect(native.click).not.toHaveBeenCalled();
  expect(doc.createElement).not.toHaveBeenCalled();
  expect(doc.body.style.overflow).toBe('auto');
  // 用户用原有按钮退出后，扩展退出操作不能再次打开网页全屏。
  web.click();
  fullscreen(false);
  expect(web.click).toHaveBeenCalledTimes(2);
});

test('does not exit a web fullscreen session the user entered', () => {
  const { web } = setup(true);
  const fullscreen = createPlayerFullscreen();
  fullscreen(true);
  fullscreen(false);
  expect(web.click).not.toHaveBeenCalled();
});

test('uses the native control with local activation and exits only its own player', () => {
  const { web, native, doc, player } = setup(false, true);
  const fullscreen = createPlayerFullscreen();
  fullscreen(true);
  expect(native.click).toHaveBeenCalledOnce();
  expect(web.click).not.toHaveBeenCalled();
  doc.fullscreenElement = {};
  fullscreen(false);
  expect(doc.exitFullscreen).not.toHaveBeenCalled();
  doc.fullscreenElement = null;
  fullscreen(true);
  doc.fullscreenElement = player;
  fullscreen(false);
  expect(doc.exitFullscreen).toHaveBeenCalledOnce();
});

test('a rejected native request cannot reopen fullscreen after exit', async () => {
  const { player, web } = setup(false, true);
  player.querySelector = (selector: string) =>
    selector === '.bpx-player-ctrl-web' ? web : (null as never);
  let reject!: (reason: Error) => void;
  Object.assign(player, {
    requestFullscreen: () =>
      new Promise<void>((_, fail) => {
        reject = fail;
      }),
  });
  const fullscreen = createPlayerFullscreen();
  fullscreen(true);
  fullscreen(false);
  reject(new Error('not allowed'));
  await Promise.resolve();
  expect(web.click).not.toHaveBeenCalled();
});
