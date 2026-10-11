import { DEFAULT_SYNC_INTERVAL_MS, type ControlAction } from '@aglaea/shared';
import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';

import { iconPaths } from '../src/icons.ts';
import type {
  ExtensionRequest,
  ExtensionResponse,
  ExtensionState,
  PlayerSnapshot,
} from '../src/messaging.ts';
import {
  isPlaybackUrl,
  playbackMatches,
  playbackPageKey,
  roomPlaybackUrl,
} from '../src/playback-page.ts';
import { createPlayerFullscreen } from '../src/player-fullscreen.ts';
import { createPlayerOverlay } from '../src/player-overlay.ts';
import { applyPlayback } from '../src/player-sync.ts';

interface BilibiliPlayerWindow extends Window {
  player?: {
    play?: () => void;
    pause?: () => void;
    seek?: (seconds: number) => void;
    getCurrentTime?: () => number;
    getDuration?: () => number;
    getVideoMessage?: () => { bvid?: string; cid?: number; aid?: number };
    setVolume?: (volume: number) => void;
    requestFullscreen?: () => void;
  };
}

export default defineContentScript({
  matches: playbackMatches,
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  main() {
    let video: HTMLVideoElement | undefined;
    let state: ExtensionState | undefined;
    let lastEpisodeKey = '';
    let videoEvents: AbortController | undefined;
    let appliedKey = '';
    let applying = false;
    let pending = false;
    let navigating = false;
    let manualSyncing = false;
    let fullscreenActive = false;
    const fullscreen = createPlayerFullscreen();
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && fullscreenActive) {
        fullscreen(false);
        fullscreenActive = false;
      }
    });

    const host = document.createElement('div');
    host.id = 'aglaea-root';
    host.style.cssText =
      'position:absolute;right:16px;top:64px;max-width:calc(100% - 32px);z-index:2147483647;pointer-events:none;display:none;';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .stack { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; font-family: "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif; }
        .toast { max-width: 320px; padding: 10px 14px; border: 1px solid rgba(180, 180, 180, .18); border-radius: 12px;
          background: rgba(0, 0, 0, .65); color: #f3f0e8; font-size: 13px; line-height: 1.45; box-shadow: 0 12px 32px rgba(0,0,0,.35);
          pointer-events: auto; animation: rise .18s ease-out; }
        .status { display: flex; align-items: center; gap: 8px; padding: 2px 8px 2px 10px; border-radius: 999px; pointer-events: auto;
          background: rgba(12, 12, 12, .86); border: 1px solid rgba(216, 180, 106, .35); color: #d8b46a;
          font-size: 11px; letter-spacing: .04em; cursor: grab; user-select: none; touch-action: none; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #69cdad; }
        .toast-host { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
        .status-host { transition: opacity .18s ease; }
        .sync-button { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border-radius: 50%;
          border: 0; background: transparent; color: #69cdad; cursor: pointer; opacity: .8; }
        .sync-button:hover { opacity: 1; }
        .sync-button:focus-visible { outline: 2px solid #69cdad; outline-offset: 2px; }
        .sync-button:disabled { opacity: .4; cursor: not-allowed; }
        @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      </style>
      <div class="stack"><div class="status-host"></div><div class="toast-host"></div></div>
    `;
    const toastHost = shadow.querySelector<HTMLDivElement>('.toast-host')!;
    const statusHost = shadow.querySelector<HTMLDivElement>('.status-host')!;
    const statusBar = document.createElement('div');
    statusBar.className = 'status';
    statusBar.title = '拖动调整位置';
    const statusText = document.createElement('span');
    const syncButton = document.createElement('button');
    syncButton.type = 'button';
    syncButton.className = 'sync-button';
    syncButton.title = '手动同步';
    syncButton.setAttribute('aria-label', '手动同步');
    syncButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths.sync}" /></svg>`;
    syncButton.addEventListener('click', () => void manualSync());
    statusBar.append(statusText, syncButton);
    statusHost.append(statusBar);
    statusHost.style.display = 'none';
    document.documentElement.append(host);

    const overlay = createPlayerOverlay(
      host,
      statusHost,
      statusBar,
      syncButton,
      () =>
        document.querySelector<HTMLElement>('.bpx-player-container, #bilibili-player') ??
        video?.parentElement ??
        undefined,
    );

    function toast(message: string, tone: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
      const item = document.createElement('div');
      item.className = `toast ${tone}`;
      item.textContent = message;
      toastHost.append(item);
      overlay.update();
      setTimeout(() => item.remove(), 4_200);
    }

    function renderStatus(): void {
      if (!state?.config.roomCode || !state.isBoundPlayer) {
        host.style.display = 'none';
        statusHost.style.display = 'none';

        return;
      }

      const online = state.status === 'connected';
      host.style.display = 'block';
      overlay.update();
      statusHost.style.display = 'block';
      const playerStatus = video ? '已连接播放器' : '等待播放器';
      statusText.textContent = `${online ? playerStatus : '连接中'} · ${state.config.roomCode}`;
      syncButton.disabled = manualSyncing || !online || !video;
      syncButton.setAttribute('aria-busy', String(manualSyncing));
    }

    async function manualSync(): Promise<void> {
      if (manualSyncing || state?.status !== 'connected' || !state.isBoundPlayer || !video) {
        return;
      }

      manualSyncing = true;
      renderStatus();

      try {
        const result = await request({ type: 'execute-control', action: { type: 'resync' } });

        if (!result) {
          throw new Error('手动同步失败，后台未响应');
        }

        if (result.lastError) {
          throw new Error(result.lastError);
        }

        toast(state?.role === 'owner' ? '已广播当前播放状态' : '已对齐房间进度', 'success');
      } catch (cause) {
        toast(cause instanceof Error ? cause.message : '手动同步失败', 'error');
      } finally {
        manualSyncing = false;
        renderStatus();
      }
    }

    function findVideo(): HTMLVideoElement | undefined {
      if (!isPlaybackUrl(location.href)) {
        return undefined;
      }

      return document.querySelector<HTMLVideoElement>('video') ?? undefined;
    }

    function readPlayer(): BilibiliPlayerWindow['player'] {
      return (window as BilibiliPlayerWindow).player;
    }

    function readSnapshot(): PlayerSnapshot | undefined {
      if (!video) {
        return undefined;
      }

      return {
        position: Number.isFinite(video.currentTime) ? video.currentTime : 0,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        paused: video.paused,
        playbackRate: video.playbackRate || 1,
        media: readMedia(),
      };
    }

    function readMedia(): PlayerSnapshot['media'] {
      const player = readPlayer();
      const message = player?.getVideoMessage?.();
      const url = new URL(location.href);
      const episodeIndex = Number(url.searchParams.get('p') ?? '1') - 1;

      return {
        platform: 'bilibili',
        bvid: message?.bvid ?? url.pathname.match(/\/video\/(BV[\w]+)/)?.[1],
        cid: message?.cid,
        episodeIndex: Number.isFinite(episodeIndex) ? Math.max(0, episodeIndex) : undefined,
        episodeTitle:
          document.querySelector<HTMLAnchorElement>('.list-box .on a, .video-list-item.on')
            ?.title ?? document.title,
        title: document.title.replace(/_哔哩哔哩.*$/, ''),
        url: url.href,
      };
    }

    async function request(message: ExtensionRequest): Promise<ExtensionState | undefined> {
      const response = (await browser.runtime.sendMessage(message).catch(() => undefined)) as
        | ExtensionResponse
        | undefined;

      if (response?.state) {
        receiveState(response.state);
      }

      return response?.state;
    }

    function receiveState(next: ExtensionState): void {
      const justConnected = next.status === 'connected' && state?.status !== 'connected';
      const justBound = next.isBoundPlayer && !state?.isBoundPlayer;

      if (!next.isBoundPlayer && fullscreenActive) {
        fullscreen(false);
        fullscreenActive = false;
      }

      if (justBound) {
        appliedKey = '';
        navigating = false;
      }

      state = next;
      renderStatus();

      if ((justConnected || justBound) && next.role === 'owner' && next.isBoundPlayer) {
        sync('tick');
      }

      void followRoom();
    }

    async function followRoom(): Promise<void> {
      if (applying) {
        pending = true;

        return;
      }

      const snapshot = state?.snapshot;

      if (!video || !snapshot || !canFollowRoom()) {
        return;
      }

      const key = `${snapshot.roomCode}:${snapshot.round}:${snapshot.playback.updatedAt}`;

      if (key === appliedKey) {
        return;
      }

      const media = snapshot.media;
      const targetUrl = roomPlaybackUrl(media);

      if (targetUrl && playbackPageKey(targetUrl) !== playbackPageKey(location.href)) {
        navigating = true;
        location.assign(targetUrl);

        return;
      }

      if (video.readyState < 1 || !media.url) {
        return;
      }

      applying = true;
      appliedKey = key;

      await followPlayback(video, snapshot);
    }

    function canFollowRoom(): boolean {
      return (
        state?.status === 'connected' &&
        state.role === 'member' &&
        Boolean(state.isBoundPlayer) &&
        !navigating
      );
    }

    async function followPlayback(
      video: HTMLVideoElement,
      snapshot: NonNullable<ExtensionState['snapshot']>,
    ): Promise<void> {
      try {
        const changed = await applyPlayback(
          video,
          snapshot.playback,
          Date.now() + (state?.clockOffsetMs ?? 0),
          ['seek', 'manual', 'episode'].includes(state?.syncSource ?? ''),
        );

        if (changed) {
          void request({
            type: 'room-notice',
            message: `视频已校准：${snapshot.playback.paused ? '暂停' : '播放'}，${video.currentTime.toFixed(1)} 秒`,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '播放器同步失败';
        toast(`同步失败，请先手动播放一次视频：${message}`, 'warning');
        void request({ type: 'room-notice', message: `播放器同步失败：${message}` });
      } finally {
        applying = false;

        if (pending) {
          pending = false;
          void followRoom();
        }
      }
    }

    function sync(source: 'play' | 'pause' | 'seek' | 'ratechange' | 'episode' | 'tick'): void {
      if (!state?.isBoundPlayer || !isPlaybackUrl(location.href)) {
        return;
      }

      const snapshot = readSnapshot();

      if (!snapshot || !video || video.readyState < 1) {
        return;
      }

      if (source === 'tick' || state?.role !== 'owner') {
        void request({ type: 'player-snapshot', snapshot });
      } else {
        void request({ type: 'player-event', source, snapshot });
      }
    }

    function bindVideo(next: HTMLVideoElement): void {
      videoEvents?.abort();
      videoEvents = new AbortController();
      video = next;
      appliedKey = '';
      const episodeKey = `${location.pathname}${location.search}`;

      if (episodeKey !== lastEpisodeKey) {
        lastEpisodeKey = episodeKey;
        sync('episode');
      }

      for (const event of ['play', 'pause', 'seeking', 'seeked', 'ratechange'] as const) {
        next.addEventListener(
          event,
          () => sync(event === 'seeked' || event === 'seeking' ? 'seek' : event),
          {
            signal: videoEvents.signal,
          },
        );
      }

      next.addEventListener(
        'loadedmetadata',
        () => {
          appliedKey = '';
          sync('tick');
          void followRoom();
        },
        { signal: videoEvents.signal },
      );
      renderStatus();
      sync('tick');
      void followRoom();
      void request({ type: 'room-notice', message: '已检测到视频播放器' });
    }

    const observer = new MutationObserver(() => {
      const next = findVideo();

      if (next && next !== video) {
        bindVideo(next);
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    const initialVideo = findVideo();

    if (initialVideo) {
      bindVideo(initialVideo);
    }

    // 同一个周期内读取并上报，不再用独立定时器上传旧采样。
    setInterval(() => {
      const next = findVideo();

      if (next && next !== video) {
        bindVideo(next);

        return;
      }

      if (!next) {
        videoEvents?.abort();
        video = undefined;
        renderStatus();

        return;
      }

      sync('tick');
    }, DEFAULT_SYNC_INTERVAL_MS);

    async function syncOwner(video: HTMLVideoElement): Promise<void> {
      const snapshot = readSnapshot();

      if (!snapshot || video.readyState < 1) {
        throw new Error('播放器尚未就绪');
      }

      const response = await request({ type: 'player-event', source: 'seek', snapshot });

      if (!response) {
        throw new Error('手动同步失败，后台未响应');
      }
    }

    async function resyncPlayer(video: HTMLVideoElement): Promise<void> {
      const latest = await request({ type: 'get-state' });

      if (!latest || latest.status !== 'connected') {
        throw new Error('请先连接房间再手动同步');
      }

      if (latest.role === 'owner') {
        await syncOwner(video);
      } else if (latest.role === 'member') {
        if (!latest.snapshot || !latest.snapshot.media.url) {
          throw new Error('等待房主上传播放状态');
        }

        if (video.readyState < 1) {
          throw new Error('播放器尚未就绪');
        }

        await applyPlayback(
          video,
          latest.snapshot.playback,
          Date.now() + (latest.clockOffsetMs ?? 0),
          true,
        );
      } else {
        throw new Error('当前身份无法同步播放器');
      }
    }

    function seekPlayer(position: number): void {
      readPlayer()?.seek?.(position);
    }

    function requireBoundPlayer(): void {
      if (!state?.isBoundPlayer || !isPlaybackUrl(location.href)) {
        throw new Error('此页面未绑定房间播放器');
      }
    }

    function setPlayerVolume(video: HTMLVideoElement, volume: number): void {
      video.volume = volume;
      video.muted = volume === 0;
      readPlayer()?.setVolume?.(Math.round(volume * 100));
    }

    type PlaybackAction = Extract<
      ControlAction,
      { type: 'play' | 'pause' | 'toggle' | 'seek' | 'skip' | 'rate' }
    >;

    function isPlaybackAction(action: ControlAction): action is PlaybackAction {
      return ['play', 'pause', 'toggle', 'seek', 'skip', 'rate'].includes(action.type);
    }

    async function executePlaybackControl(
      video: HTMLVideoElement,
      action: PlaybackAction,
    ): Promise<void> {
      const player = readPlayer();

      switch (action.type) {
        case 'play': {
          await video.play();

          return;
        }

        case 'pause': {
          video.pause();
          player?.pause?.();

          return;
        }

        case 'toggle': {
          if (video.paused) {
            await video.play();
          } else {
            video.pause();
          }

          return;
        }

        case 'seek': {
          video.currentTime = Math.min(video.duration || Number.POSITIVE_INFINITY, action.position);
          seekPlayer(action.position);
          sync('seek');

          return;
        }

        case 'skip': {
          video.currentTime = Math.max(0, video.currentTime + action.delta);
          sync('seek');

          return;
        }

        case 'rate': {
          video.playbackRate = action.playbackRate;

          return;
        }
      }
    }

    async function executeControl(action: ControlAction): Promise<void> {
      requireBoundPlayer();

      if (!video) {
        throw new Error('视频尚未加载，请等待播放器出现');
      }

      if (isPlaybackAction(action)) {
        await executePlaybackControl(video, action);

        return;
      }

      switch (action.type) {
        case 'volume': {
          setPlayerVolume(video, action.volume);
          break;
        }

        case 'fullscreen': {
          fullscreen(action.enabled !== false);
          fullscreenActive = action.enabled !== false;
          break;
        }

        case 'resync': {
          await resyncPlayer(video);
          break;
        }

        case 'next':

        case 'prev': {
          const selector =
            action.type === 'next' ? '.bpx-player-ctrl-next' : '.bpx-player-ctrl-prev';

          document.querySelector<HTMLElement>(selector)?.click();
          break;
        }

        default: {
          break;
        }
      }
    }

    browser.runtime.onMessage.addListener(
      (
        raw: unknown,
        _sender: unknown,
        respond: (response: { ok: boolean; error?: string }) => void,
      ) => {
        const message = raw as { type: string; payload?: unknown; state?: ExtensionState };

        if (message.type === 'aglaea:state' && message.state) {
          receiveState(message.state);
        }

        if (message.type === 'aglaea:toast') {
          const payload = message.payload as {
            message: string;
            tone: 'info' | 'success' | 'warning' | 'error';
          };

          toast(payload.message, payload.tone);
        }

        if (message.type === 'aglaea:execute-control') {
          void executeControl(message.payload as ControlAction).then(
            () => respond({ ok: true }),
            (error: unknown) =>
              respond({
                ok: false,
                error: error instanceof Error ? error.message : '播放控制失败',
              }),
          );

          return true;
        }

        return undefined;
      },
    );

    void request({ type: 'get-state' });
  },
});
