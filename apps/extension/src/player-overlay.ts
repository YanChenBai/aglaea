import { enableOverlayDrag } from './overlay-drag.ts';

export function createPlayerOverlay(
  host: HTMLElement,
  status: HTMLElement,
  handle: HTMLElement,
  button: HTMLElement,
  getPlayer: () => HTMLElement | undefined,
) {
  let parent: HTMLElement | undefined;
  let events: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let hovered = false;
  let focused = false;

  const clamp = enableOverlayDrag(
    host,
    handle,
    button,
    () =>
      parent?.getBoundingClientRect() ?? { width: window.innerWidth, height: window.innerHeight },
  );

  const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(clamp);
  const positioning = document.createElement('style');
  // 零优先级补足静态容器定位，B 站自己的全屏样式始终优先。
  positioning.textContent = ':where([data-aglaea-overlay-container]) { position: relative; }';
  document.documentElement.append(positioning);

  function show(): void {
    status.style.opacity = '1';
    status.style.visibility = 'visible';
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (hovered || focused) {
        return;
      }

      status.style.opacity = '0';
      status.style.visibility = 'hidden';
    }, 2_500);
  }

  handle.addEventListener('pointerenter', () => {
    hovered = true;
    show();
  });
  handle.addEventListener('pointerleave', () => {
    hovered = false;
    show();
  });
  handle.addEventListener('focusin', () => {
    focused = true;
    show();
  });
  handle.addEventListener('focusout', () => {
    focused = false;
    show();
  });

  function update(): void {
    const player = getPlayer();
    const fullscreen = document.fullscreenElement as HTMLElement | null;

    const next =
      player &&
      fullscreen &&
      fullscreen.tagName !== 'VIDEO' &&
      (fullscreen.contains(player) || player.contains(fullscreen))
        ? fullscreen
        : player;

    if (!next) {
      return;
    }

    if (parent !== next) {
      events?.abort();
      resize?.disconnect();
      parent?.removeAttribute('data-aglaea-overlay-container');
      parent = next;
      next.setAttribute('data-aglaea-overlay-container', '');
      next.append(host);
      events = new AbortController();
      next.addEventListener('pointermove', show, { signal: events.signal });
      next.addEventListener('pointerenter', show, { signal: events.signal });
      resize?.observe(next);
      show();
    }

    clamp();
  }

  document.addEventListener('fullscreenchange', update);

  return { update, show };
}
