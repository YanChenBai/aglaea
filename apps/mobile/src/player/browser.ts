// 此函数序列化后在 WebView 执行，不能引用模块作用域或原生 API。
export function installPlayer(): void {
  type FollowState = {
    position: number;
    duration: number;
    paused: boolean;
    playbackRate: number;
    sentAt: number;
    tolerance: number;
    force: boolean;
  };

  const scope = window as unknown as {
    aglaeaDispose?: () => void;
    aglaeaAudioFocus?: (allowed: boolean) => void;
    nsWebViewBridge: {
      on(name: string, handler: (state: FollowState) => void): void;
      off(name: string, handler: (state: FollowState) => void): void;
      emit(name: string, data: unknown): void;
    };
  };

  scope.aglaeaDispose?.();
  let state: FollowState | undefined;
  let lastVideo: HTMLVideoElement | null = null;
  let applying = false;
  let lastStatus = '';
  let audioAllowed = false;
  let playerReady = false;

  scope.aglaeaAudioFocus = allowed => {
    audioAllowed = allowed;

    if (!allowed) {
      document.querySelector<HTMLVideoElement>('video')?.pause();
    }

    void apply();
  };

  function status(message: string): void {
    if (message !== lastStatus) {
      lastStatus = message;
      scope.nsWebViewBridge.emit('aglaeaStatus', { message });
    }
  }

  function align(video: HTMLVideoElement, current: FollowState, replaced: boolean): void {
    const elapsed = current.paused
      ? 0
      : (Math.max(0, Date.now() - current.sentAt) / 1_000) * current.playbackRate;

    const duration =
      video.duration > 0 && Number.isFinite(video.duration) ? video.duration : Infinity;

    const target = Math.min(duration, current.position + elapsed);
    const drift = Math.abs(video.currentTime - target);
    const exact = current.force || replaced || current.paused;

    if (drift > current.tolerance || (exact && drift > 0.05)) {
      video.currentTime = target;
    }

    current.force = false;
    video.playbackRate = current.playbackRate;
  }

  function reportPlayer(video: HTMLVideoElement | null): void {
    const ready = (video?.readyState ?? 0) >= 1;

    if (ready !== playerReady) {
      playerReady = ready;
      scope.nsWebViewBridge.emit('aglaeaPlayer', { ready });
    }
  }

  async function apply(): Promise<void> {
    const video = document.querySelector<HTMLVideoElement>('video');
    reportPlayer(video);

    if (!video || video.readyState < 1) {
      status('等待页面播放器就绪');

      return;
    }

    if (!state || applying) {
      return;
    }

    const current = state;
    const replaced = video !== lastVideo;
    lastVideo = video;
    applying = true;

    try {
      align(video, current, replaced);

      if (current.paused || !audioAllowed) {
        video.pause();
      } else if (video.paused) {
        await video.play();
      }

      status(
        !current.paused && !audioAllowed
          ? '音频焦点不可用，已暂停本机播放'
          : `已跟随房主 · ${current.paused ? '暂停' : '播放'} · ${video.currentTime.toFixed(1)} 秒`,
      );
    } catch {
      status('播放受限，请先在页面点击播放');
    } finally {
      applying = false;
    }
  }

  function receive(next: FollowState): void {
    state = next;
    void apply();
  }

  scope.nsWebViewBridge.on('aglaeaFollow', receive);
  const timer = setInterval(() => void apply(), 1_000);

  scope.aglaeaDispose = () => {
    clearInterval(timer);
    scope.nsWebViewBridge.off('aglaeaFollow', receive);
    delete scope.aglaeaAudioFocus;
  };

  status('播放器桥接已就绪');
}

export function playerScript(): string {
  return `(${installPlayer.toString()})();`;
}

// 使用 B 站网页全屏按钮，不请求浏览器原生视频全屏。
export function togglePageFullscreen(enabled?: boolean): boolean {
  const player = document.querySelector<HTMLElement>('#bilibili-player, .bpx-player-container');
  const button = player?.querySelector<HTMLElement>('.bpx-player-ctrl-web');

  if (!button) {
    throw new Error('未找到播放器的网页全屏按钮，请等待视频加载');
  }

  const entered = button.classList.contains('bpx-state-entered');
  const next = enabled ?? !entered;

  if (next !== entered) {
    button.click();
  }

  return next;
}

export function fullscreenScript(enabled?: boolean): string {
  return `(${togglePageFullscreen.toString()})(${enabled === undefined ? '' : enabled});`;
}
