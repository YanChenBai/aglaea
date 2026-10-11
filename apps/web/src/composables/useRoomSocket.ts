import {
  computeClockOffset,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  projectPlayback,
  PROTOCOL_VERSION,
  type ClientMessage,
  type ClientRole,
  type ControlAction,
  type MemberView,
  type RoomMemberKind,
  type RoomSnapshot,
  type ServerMessage,
} from '@aglaea/shared';
import { computed, onUnmounted, ref } from 'vue';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface RoomSocketOptions {
  serverUrl: string;
  roomCode: string;
  clientId: string;
  name: string;
  role: ClientRole;
  kind: RoomMemberKind;
  ownerToken?: string;
  controllerToken?: string;
}

export function useRoomSocket(options: RoomSocketOptions) {
  const snapshot = ref<RoomSnapshot>();
  const status = ref<ConnectionStatus>('idle');
  const error = ref('');
  const clockOffsetMs = ref(0);
  const localPosition = ref(0);
  const you = ref<MemberView>();

  let socket: WebSocket | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let playbackTimer: ReturnType<typeof setInterval> | undefined;
  let lastPingAt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let reconnectAttempts = 0;

  const connected = computed(() => status.value === 'connected');
  const paused = computed(() => snapshot.value?.playback.paused ?? true);
  const members = computed(() => snapshot.value?.members ?? []);

  const canControl = computed(
    () =>
      connected.value &&
      (options.role === 'owner' ||
        (options.role === 'controller' && you.value?.remoteTarget?.role === 'owner')),
  );

  function send(message: ClientMessage): void {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  function connect(): void {
    if (!options.roomCode) {
      status.value = 'idle';
      error.value = '缺少房间号';

      return;
    }

    disconnect();
    status.value = 'connecting';
    error.value = '';

    const wsBase = options.serverUrl.replace(/\/$/, '').replace(/^http/, 'ws');
    const next = new WebSocket(`${wsBase}/ws`);
    socket = next;

    next.addEventListener('open', () => {
      if (socket !== next) {
        return;
      }

      send({
        type: 'hello',
        payload: {
          protocolVersion: PROTOCOL_VERSION,
          roomCode: options.roomCode,
          clientId: options.clientId,
          name: options.name,
          role: options.role,
          kind: options.kind,
          ownerToken: options.ownerToken,
          controllerToken: options.controllerToken,
        },
      });
    });

    next.addEventListener('message', event => {
      if (socket !== next) {
        return;
      }

      const message = safeParse(event.data) as ServerMessage | undefined;

      if (message?.type) {
        handleMessage(message);
      }
    });

    next.addEventListener('error', () => {
      if (socket !== next) {
        return;
      }

      status.value = 'error';
      error.value = '无法连接同步服务器';
    });

    next.addEventListener('close', () => {
      if (socket !== next) {
        return;
      }

      stopTimers();
      status.value = 'connecting';
      error.value = '连接中断，正在自动重连';
      reconnectTimer = setTimeout(connect, Math.min(1_000 * 2 ** reconnectAttempts++, 10_000));
    });
  }

  function handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'hello':

      case 'snapshot': {
        snapshot.value = message.type === 'hello' ? message.payload.snapshot : message.payload;
        localPosition.value = snapshot.value.playback.position;
        status.value = 'connected';
        error.value = '';

        if (message.type === 'hello') {
          you.value = message.payload.you;
          reconnectAttempts = 0;
          clockOffsetMs.value = snapshot.value.playback.serverClock - Date.now();
          startTimers();
        }

        break;
      }

      case 'sync': {
        snapshot.value = message.payload;
        localPosition.value = message.payload.playback.position;
        break;
      }

      case 'member-joined':

      case 'member-left': {
        snapshot.value = message.payload.snapshot;
        break;
      }

      case 'pong': {
        const roundTrip = Date.now() - lastPingAt;
        clockOffsetMs.value = computeClockOffset(lastPingAt, message.payload.serverTime, roundTrip);
        break;
      }

      case 'error': {
        error.value = message.payload.message;
        status.value = 'error';
        break;
      }

      case 'control': {
        break;
      }
    }
  }

  function startTimers(): void {
    stopTimers();

    const ping = (): void => {
      lastPingAt = Date.now();
      send({ type: 'ping', payload: { clientTime: lastPingAt } });
    };

    ping();
    heartbeatTimer = setInterval(ping, DEFAULT_HEARTBEAT_INTERVAL_MS);

    playbackTimer = setInterval(() => {
      if (!snapshot.value) {
        return;
      }

      const elapsed = Date.now() - snapshot.value.playback.updatedAt + clockOffsetMs.value;
      localPosition.value = projectPlayback(snapshot.value.playback, elapsed);
    }, 250);
  }

  function stopTimers(): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }

    if (playbackTimer) {
      clearInterval(playbackTimer);
    }

    heartbeatTimer = undefined;
    playbackTimer = undefined;
  }

  function control(action: ControlAction): void {
    const personalAction =
      action.type === 'volume' || action.type === 'fullscreen' || action.type === 'resync';

    if (!connected.value || (!canControl.value && !personalAction)) {
      error.value = '当前身份没有控制权限';

      return;
    }

    send({ type: 'control', payload: { action } });

    if (action.type === 'seek') {
      localPosition.value = action.position;
    }

    if (action.type === 'skip' && snapshot.value) {
      localPosition.value = Math.max(0, snapshot.value.playback.position + action.delta);
    }
  }

  function refresh(): void {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      connect();
    }
  }

  function disconnect(): void {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
    stopTimers();
    const previous = socket;
    socket = undefined;
    previous?.close();
  }

  onUnmounted(disconnect);

  return {
    snapshot,
    you,
    status,
    error,
    clockOffsetMs,
    localPosition,
    connected,
    paused,
    members,
    canControl,
    connect,
    disconnect,
    control,
    refresh,
  };
}

function safeParse(data: unknown): unknown {
  if (typeof data !== 'string') {
    return data;
  }

  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}
