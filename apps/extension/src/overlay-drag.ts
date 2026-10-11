export function enableOverlayDrag(
  host: HTMLElement,
  handle: HTMLElement,
  button: HTMLElement,
  bounds = () => ({ width: window.innerWidth, height: window.innerHeight }),
): () => void {
  const margin = 12;
  let drag: { pointerId: number; x: number; y: number; right: number; top: number } | undefined;

  function position(right: number, top: number): void {
    const rect = handle.getBoundingClientRect();
    const size = bounds();
    const maxTop = Math.max(margin, size.height - rect.height - margin);
    host.style.right = `${Math.max(margin, Math.min(right, size.width - rect.width - margin))}px`;
    host.style.top = `${Math.max(Math.min(64, maxTop), Math.min(top, maxTop))}px`;
  }

  handle.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || button.contains(event.target as Node)) {
      return;
    }

    drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      right: Number.parseFloat(host.style.right) || 16,
      top: Number.parseFloat(host.style.top) || 64,
    };
    handle.setPointerCapture(event.pointerId);
    handle.style.cursor = 'grabbing';
    event.preventDefault();
  });

  handle.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    position(drag.right - (event.clientX - drag.x), drag.top + (event.clientY - drag.y));
  });

  function stop(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    drag = undefined;
    handle.style.cursor = 'grab';

    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
  }

  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
  handle.addEventListener('lostpointercapture', stop);

  const clamp = () =>
    position(Number.parseFloat(host.style.right) || 16, Number.parseFloat(host.style.top) || 64);

  window.addEventListener('resize', clamp);

  return clamp;
}
