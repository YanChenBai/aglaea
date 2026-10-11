export function createPlayerFullscreen() {
  let ownedButton: HTMLElement | undefined;

  return (enabled?: boolean): boolean => {
    if (enabled === false) {
      if (ownedButton?.classList.contains('bpx-state-entered')) {
        ownedButton.click();
      }

      ownedButton = undefined;

      return false;
    }

    const player = document.querySelector<HTMLElement>('#bilibili-player, .bpx-player-container');

    if (!player) {
      throw new Error('未找到可网页全屏的播放器');
    }

    if (document.fullscreenElement) {
      return false;
    }

    const button = player.querySelector<HTMLElement>('.bpx-player-ctrl-web');

    if (!button) {
      throw new Error('未找到播放器的网页全屏按钮');
    }

    const entered = button.classList.contains('bpx-state-entered');
    const next = enabled ?? !entered;

    if (entered === next) {
      return entered;
    }

    // 以播放器当前状态切换，避免手动退出后遥控页面的状态过期。
    ownedButton = next ? button : undefined;
    button.click();

    return next;
  };
}
