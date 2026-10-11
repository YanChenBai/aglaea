import type { ControlAction, ServerMessage } from '@aglaea/shared';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';

import type {
  ExtensionConfig,
  ExtensionLog,
  ExtensionRequest,
  ExtensionResponse,
  ExtensionState,
} from './messaging.ts';
import { isPlaybackUrl, playbackMatches, roomPlaybackUrl } from './playback-page.ts';
import { RoomClient } from './room-client.ts';

const DEFAULT_CONFIG: ExtensionConfig = {
  serverUrl: 'http://localhost:8787',
  name: 'Aglaea',
};

export default defineBackground({
  type: 'module',
  main() {
    let state: ExtensionState = { config: DEFAULT_CONFIG, status: 'idle', role: 'none' };
    let client: RoomClient | undefined;
    let clientId: string = crypto.randomUUID();
    let playerTabId: number | undefined;
    let pendingVideoRoom: string | undefined;
    let openingVideo = false;

    const ready = load();

    browser.tabs.onRemoved.addListener(tabId => {
      void ready.then(() => {
        if (tabId !== playerTabId) {
          return;
        }

        playerTabId = undefined;
        state = { ...state, playerTabId: undefined };
        leaveRoom();
      });
    });

    function savedRole(config: ExtensionConfig): ExtensionState['role'] {
      if (!config.roomCode) {
        return 'none';
      }

      return config.ownerToken ? 'owner' : 'member';
    }

    async function load(): Promise<void> {
      const stored = await browser.storage.local.get([
        'config',
        'clientId',
        'controlUrl',
        'playerTabId',
        'pendingVideoRoom',
      ]);

      clientId = typeof stored.clientId === 'string' ? String(stored.clientId) : clientId;
      await browser.storage.local.set({ clientId });

      if (isConfig(stored.config)) {
        const config = { ...DEFAULT_CONFIG, ...stored.config };
        state = {
          ...state,
          config,
          role: savedRole(config),
          controlUrl: typeof stored.controlUrl === 'string' ? stored.controlUrl : undefined,
        };
      }

      playerTabId = typeof stored.playerTabId === 'number' ? stored.playerTabId : undefined;
      state = { ...state, playerTabId };
      pendingVideoRoom =
        stored.pendingVideoRoom === state.config.roomCode && state.role === 'member'
          ? state.config.roomCode
          : undefined;
      log('后台已启动，配置加载完成');
      broadcast();

      if (state.config.roomCode) {
        ensureClient().connect();
      }
    }

    function isConfig(value: unknown): value is ExtensionConfig {
      return value !== null && typeof value === 'object' && 'serverUrl' in value && 'name' in value;
    }

    function persist(): void {
      void browser.storage.local.set({
        config: state.config,
        clientId,
        controlUrl: state.controlUrl ?? null,
        playerTabId: playerTabId ?? null,
        pendingVideoRoom: pendingVideoRoom ?? null,
      });
    }

    function log(message: string, level: ExtensionLog['level'] = 'info'): void {
      // 保留最近 100 条事件，不记录遥控链接中的令牌。
      state = {
        ...state,
        logs: [
          ...(state.logs ?? []),
          { id: crypto.randomUUID(), time: Date.now(), level, message },
        ].slice(-100),
      };
    }

    function broadcast(): void {
      void browser.runtime.sendMessage({ type: 'aglaea:state', state }).catch(() => undefined);
      void browser.tabs.query({ url: playbackMatches }).then(tabs => {
        for (const tab of tabs) {
          if (typeof tab.id === 'number') {
            void browser.tabs
              .sendMessage(tab.id, {
                type: 'aglaea:state',
                state: {
                  ...state,
                  isBoundPlayer: tab.id === playerTabId && isPlaybackUrl(tab.url),
                },
              })
              .catch(() => undefined);
          }
        }
      });
    }

    function notifyContent(message: string, tone: 'info' | 'success' | 'warning' | 'error'): void {
      log(message, tone);
      broadcast();
      void browser.tabs.query({ url: playbackMatches }).then(tabs => {
        for (const tab of tabs) {
          if (typeof tab.id === 'number' && tab.id === playerTabId && isPlaybackUrl(tab.url)) {
            void browser.tabs
              .sendMessage(tab.id, { type: 'aglaea:toast', payload: { message, tone } })
              .catch(() => undefined);
          }
        }
      });
    }

    function ensureClient(): RoomClient {
      client?.disconnect();
      client = new RoomClient(state.config, clientId, {
        onStatus(status, error) {
          state = { ...state, status, lastError: error };

          const labels = {
            idle: '连接已断开',
            connecting: '正在连接同步服务器',
            connected: '同步服务器已连接',
            error: '连接失败',
          };

          log(error ?? labels[status], status === 'error' ? 'error' : 'info');
          broadcast();

          if (status === 'connected') {
            notifyContent(`已进入房间 ${state.config.roomCode ?? ''}`, 'success');
          }
        },
        onMessage(message) {
          handleServerMessage(message);
        },
      });

      return client;
    }

    function receiveSnapshot(
      snapshot: NonNullable<ExtensionState['snapshot']>,
      role: ExtensionState['role'],
    ): void {
      state = { ...state, snapshot, role, syncSource: 'manual' };
    }

    function receiveControl(payload: Extract<ServerMessage, { type: 'control' }>['payload']): void {
      if (payload.targetClientId ? payload.targetClientId !== clientId : state.role !== 'owner') {
        return;
      }

      void dispatchControl(payload.action).catch((error: unknown) => {
        log(error instanceof Error ? error.message : '发送播放控制失败', 'error');
        broadcast();
      });
    }

    function handleServerMessage(message: ServerMessage): void {
      switch (message.type) {
        case 'hello': {
          receiveSnapshot(message.payload.snapshot, message.payload.you.role);
          break;
        }

        case 'snapshot': {
          receiveSnapshot(message.payload, state.role);
          break;
        }

        case 'sync': {
          state = { ...state, snapshot: message.payload, syncSource: message.payload.source };
          break;
        }

        case 'control': {
          receiveControl(message.payload);
          break;
        }

        case 'member-joined': {
          state = { ...state, snapshot: message.payload.snapshot };
          notifyContent(`${message.payload.member.name} 加入了房间`, 'info');
          break;
        }

        case 'member-left': {
          state = { ...state, snapshot: message.payload.snapshot };
          notifyContent(`${message.payload.member.name} 离开了房间`, 'warning');
          break;
        }

        case 'error': {
          state = { ...state, lastError: message.payload.message, status: 'error' };
          notifyContent(message.payload.message, 'error');
          break;
        }

        case 'pong': {
          break;
        }
      }

      state = { ...state, clockOffsetMs: client?.getClockOffsetMs() ?? 0 };
      broadcast();
      maybeOpenRoomVideo();
    }

    function maybeOpenRoomVideo(): void {
      if (
        openingVideo ||
        !pendingVideoRoom ||
        state.role !== 'member' ||
        state.snapshot?.roomCode !== pendingVideoRoom ||
        !roomPlaybackUrl(state.snapshot.media)
      ) {
        return;
      }

      pendingVideoRoom = undefined;
      persist();
      void openRoomVideo().catch((error: unknown) => {
        state = {
          ...state,
          lastError: error instanceof Error ? error.message : '自动打开视频失败',
        };
        log(state.lastError!, 'error');
        broadcast();
      });
    }

    async function dispatchControl(action: ControlAction, sourceTabId?: number): Promise<void> {
      if (action.type === 'resync' && state.status !== 'connected') {
        throw new Error('请先连接房间再手动同步');
      }

      if (sourceTabId !== undefined && sourceTabId !== playerTabId) {
        throw new Error('此页面未绑定房间播放器');
      }

      const tabs = await browser.tabs.query({ url: playbackMatches });
      const tab = tabs.find(tab => tab.id === (sourceTabId ?? playerTabId));

      if (tab?.id && isPlaybackUrl(tab.url)) {
        const response = (await browser.tabs.sendMessage(tab.id, {
          type: 'aglaea:execute-control',
          payload: action,
        })) as { ok?: boolean; error?: string } | undefined;

        if (!response?.ok) {
          throw new Error(response?.error ?? '播放器未确认执行，请刷新视频页面');
        }

        logControl(action);
      } else {
        throw new Error('未找到可接收播放控制的 Bilibili 页面');
      }

      broadcast();
    }

    function logControl(action: ControlAction): void {
      if (action.type !== 'resync') {
        log(`已发送播放控制：${action.type}`);

        return;
      }

      state = { ...state, lastError: undefined };
      log(
        state.role === 'owner'
          ? '手动同步完成，已广播当前播放状态'
          : '手动同步完成，已对齐房间进度',
        'success',
      );
    }

    function isPlayerTab(tabId?: number): boolean {
      return tabId !== undefined && tabId === playerTabId;
    }

    async function bindPlayerTab(tabId: number): Promise<void> {
      const tabs = await browser.tabs.query({ url: playbackMatches });

      if (!tabs.some(tab => tab.id === tabId && isPlaybackUrl(tab.url))) {
        throw new Error('请选择 B 站视频或番剧播放页面');
      }

      playerTabId = tabId;
      pendingVideoRoom = undefined;
      client?.clearPlayerSnapshot();
      state = { ...state, playerTabId, lastError: undefined };
      persist();
      log('已绑定播放页面，刷新后继续使用此标签页', 'success');
      broadcast();
    }

    async function openRoomVideo(): Promise<void> {
      if (openingVideo) {
        throw new Error('视频页面正在打开');
      }

      const url = state.snapshot && roomPlaybackUrl(state.snapshot.media);

      if (!url) {
        throw new Error('等待房主上传视频信息');
      }

      const roomCode = state.config.roomCode;
      pendingVideoRoom = undefined;
      openingVideo = true;
      persist();

      try {
        const tab = await browser.tabs.create({ url, active: true });

        if (state.config.roomCode !== roomCode) {
          return;
        }

        if (tab.id === undefined) {
          throw new Error('无法打开视频页面');
        }

        // 新标签页加载前先保存绑定，首次采样与状态读取即受绑定限制。
        playerTabId = tab.id;
        client?.clearPlayerSnapshot();
        state = { ...state, playerTabId, lastError: undefined };
        persist();
        log('已打开视频并绑定播放页面', 'success');
        broadcast();
      } finally {
        openingVideo = false;
        maybeOpenRoomVideo();
      }
    }

    async function api<T>(path: string, init?: RequestInit): Promise<T> {
      const response = await fetch(`${state.config.serverUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        headers: new Headers([
          ['content-type', 'application/json'],
          ...(init?.headers ? [...new Headers(init.headers)] : []),
        ]),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? `请求失败 (${response.status})`);
      }

      return (await response.json()) as T;
    }

    async function createRoom(): Promise<void> {
      pendingVideoRoom = undefined;
      log('正在创建房间');
      broadcast();

      const created = await api<{ roomCode: string; ownerToken: string }>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ name: state.config.name }),
      });

      state = {
        ...state,
        config: {
          ...state.config,
          roomCode: created.roomCode,
          ownerToken: created.ownerToken,
          controllerToken: undefined,
        },
        role: 'owner',
        controlUrl: undefined,
        lastError: undefined,
      };
      persist();
      log(`房间 ${created.roomCode} 已创建`, 'success');
      ensureClient().connect();
      broadcast();
    }

    async function joinRoom(roomCode: string): Promise<void> {
      pendingVideoRoom = roomCode.trim().toUpperCase();
      log(`正在加入房间 ${roomCode.trim().toUpperCase()}`);
      state = {
        ...state,
        config: {
          ...state.config,
          roomCode: roomCode.trim().toUpperCase(),
          ownerToken: undefined,
          controllerToken: undefined,
        },
        role: 'member',
        snapshot: undefined,
        controlUrl: undefined,
        lastError: undefined,
      };
      persist();
      ensureClient().connect();
      broadcast();
    }

    function leaveRoom(): void {
      pendingVideoRoom = undefined;
      client?.disconnect();
      client = undefined;
      state = {
        ...state,
        config: {
          ...state.config,
          roomCode: undefined,
          ownerToken: undefined,
          controllerToken: undefined,
        },
        snapshot: undefined,
        controlUrl: undefined,
        role: 'none',
        status: 'idle',
      };
      persist();
      log('已退出房间');
      broadcast();
    }

    async function createControlLink(): Promise<void> {
      if (!state.config.roomCode) {
        throw new Error('请先进入房间');
      }

      const created = await api<{ controlUrl: string }>(
        `/api/rooms/${state.config.roomCode}/controllers`,
        {
          method: 'POST',
          body: JSON.stringify({ clientId }),
        },
      );

      state = { ...state, controlUrl: created.controlUrl, lastError: undefined };
      persist();
      broadcast();
      notifyContent('遥控链接已生成', 'success');
    }

    browser.runtime.onMessage.addListener((raw, sender, sendResponse) => {
      const request = raw as ExtensionRequest;
      void handleRequest(request, sender.tab?.id).then(response => {
        if (!response) {
          return sendResponse(response);
        }

        sendResponse({
          ...response,
          state: { ...response.state, isBoundPlayer: isPlayerTab(sender.tab?.id) },
        });
      });

      return true;
    });

    async function getState(tabId?: number): Promise<ExtensionResponse> {
      if (tabId !== undefined) {
        return { state };
      }

      const [tabs, current] = await Promise.all([
        browser.tabs.query({ url: playbackMatches }),
        browser.tabs.query({ active: true, lastFocusedWindow: true }),
      ]);

      const currentId = current.find(tab => tab.active)?.id;

      return {
        state,
        tabs: tabs
          .filter(tab => typeof tab.id === 'number' && isPlaybackUrl(tab.url))
          .map(tab => ({
            id: tab.id!,
            title: tab.title || 'B 站播放页面',
            active: tab.id === currentId,
          })),
      };
    }

    function saveConfig(config: Partial<ExtensionConfig>): ExtensionResponse {
      if (state.config.roomCode && config.name !== undefined && config.name !== state.config.name) {
        throw new Error('进入房间后不能修改名称，请先退出房间');
      }

      state = { ...state, config: { ...state.config, ...config } };
      persist();
      log('服务器和显示名称已保存', 'success');
      broadcast();

      return { state };
    }

    type PlayerRequest = Extract<
      ExtensionRequest,
      { type: 'player-snapshot' | 'player-event' | 'execute-control' | 'room-notice' }
    >;

    function isPlayerRequest(request: ExtensionRequest): request is PlayerRequest {
      return ['player-snapshot', 'player-event', 'execute-control', 'room-notice'].includes(
        request.type,
      );
    }

    function updatePlayer(
      request: Extract<PlayerRequest, { type: 'player-snapshot' | 'player-event' }>,
      tabId?: number,
    ): ExtensionResponse {
      if (!isPlayerTab(tabId) || !isPlaybackUrl(request.snapshot.media.url)) {
        return { state };
      }

      client?.setPlayerSnapshot(request.snapshot);

      if (request.type === 'player-snapshot') {
        client?.sendPlayerUpdate('tick');

        return { state };
      }

      if (state.role === 'owner' && state.status === 'connected') {
        client?.sendPlayerUpdate(request.source);
        log(`播放器事件：${request.source}`);
        broadcast();
      }

      return { state };
    }

    async function handlePlayerRequest(
      request: PlayerRequest,
      tabId?: number,
    ): Promise<ExtensionResponse> {
      switch (request.type) {
        case 'player-snapshot':

        case 'player-event': {
          return updatePlayer(request, tabId);
        }

        case 'execute-control': {
          await dispatchControl(request.action, tabId);

          return { state };
        }

        case 'room-notice': {
          if (tabId !== undefined && !isPlayerTab(tabId)) {
            return { state };
          }

          notifyContent(request.message, 'info');

          return { state };
        }

        default: {
          return { state };
        }
      }
    }

    function handleRequestError(error: unknown, tabId?: number): ExtensionResponse {
      const message = error instanceof Error ? error.message : '未知错误';
      state = { ...state, lastError: message };
      log(message, 'error');

      if (tabId) {
        void browser.tabs
          .sendMessage(tabId, { type: 'aglaea:toast', payload: { message, tone: 'error' } })
          .catch(() => undefined);
      }

      broadcast();

      return { state };
    }

    async function handleRequest(
      request: ExtensionRequest,
      tabId?: number,
    ): Promise<ExtensionResponse | undefined> {
      try {
        // 监听器同步注册，处理请求前等待已保存的配置加载完成。
        await ready;

        if (isPlayerRequest(request)) {
          return await handlePlayerRequest(request, tabId);
        }

        switch (request.type) {
          case 'get-state': {
            return await getState(tabId);
          }

          case 'bind-player-tab': {
            await bindPlayerTab(request.tabId);

            return { state };
          }

          case 'open-room-video': {
            await openRoomVideo();

            return { state };
          }

          case 'save-config': {
            return saveConfig(request.config);
          }

          case 'create-room': {
            await createRoom();

            return { state };
          }

          case 'join-room': {
            await joinRoom(request.roomCode);

            return { state };
          }

          case 'leave-room': {
            leaveRoom();

            return { state };
          }

          case 'create-control-link': {
            await createControlLink();

            return { state };
          }

          default: {
            return { state };
          }
        }
      } catch (error) {
        return handleRequestError(error, tabId);
      }
    }
  },
});
