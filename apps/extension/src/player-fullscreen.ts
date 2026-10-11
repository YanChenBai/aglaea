export function createPlayerFullscreen() {
  let nativeTarget: HTMLElement | undefined;
  let webFullscreen: HTMLElement | undefined;
  let revision = 0;

  function enterWebFullscreen(player: HTMLElement): void {
    const button = player.querySelector<HTMLElement>('.bpx-player-ctrl-web');

    if (!button || button.classList.contains('bpx-state-entered')) {
      return;
    }

    webFullscreen = button;
    button.click();
  }

  function exitFullscreen(): void {
    if (document.fullscreenElement && nativeTarget?.contains(document.fullscreenElement)) {
      void document.exitFullscreen().catch(() => {});
    }

    if (webFullscreen?.classList.contains('bpx-state-entered')) {
      webFullscreen.click();
    }

    nativeTarget = undefined;
    webFullscreen = undefined;
  }

  return (enabled: boolean): void => {
    const current = ++revision;

    if (!enabled) {
      exitFullscreen();

      return;
    }

    const player = document.querySelector<HTMLElement>('#bilibili-player, .bpx-player-container');

    if (!player) {
      throw new Error('未找到可全屏的播放器');
    }

    if (document.fullscreenElement) {
      return;
    }

    // 全屏布局交给 B 站管理，避免强制样式阻止原有按钮退出网页全屏。
    if (!navigator.userActivation?.isActive) {
      enterWebFullscreen(player);

      return;
    }

    const button = player.querySelector<HTMLElement>('.bpx-player-ctrl-full');

    if (button) {
      nativeTarget = player;
      button.click();
    } else if (player.requestFullscreen) {
      nativeTarget = player;
      void player.requestFullscreen().catch(() => {
        if (revision !== current) {
          return;
        }

        nativeTarget = undefined;
        enterWebFullscreen(player);
      });
    } else {
      enterWebFullscreen(player);
    }
  };
}
