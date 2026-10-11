import {
  computeClockOffset,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  DEFAULT_HEARTBEAT_TIMEOUT_MS,
  PROTOCOL_VERSION,
  type ClientMessage,
  type RoomSnapshot,
  type ServerMessage,
} from '@aglaea/shared';

export interface RoomSocket {
  readyState: number;
  onopen?: (event: unknown) => void;
  onmessage?: (event: { data: unknown }) => void;
  onclose?: (event: unknown) => void;
  onerror?: (event: unknown) => void;
  send(data: string): void;
  close(): void;
}

export interface RoomOptions {
  serverUrl: string;
  roomCode: string;
  name: string;
  clientId: string;
}

export type NoticeTone = 'info' | 'success' | 'warning' | 'error';

export class RoomSession {
  private socket?: RoomSocket;

  private heartbeat?: ReturnType<typeof setInterval>;

  private reconnect?: ReturnType<typeof setTimeout>;

  private attempts = 0;

  private lastPong = 0;

  private active = false;

  private joined = false;

  clockOffsetMs = 0;

  constructor(
    private readonly options: RoomOptions,
    private readonly makeSocket: (url: string) => RoomSocket,
    private readonly onSnapshot: (snapshot: RoomSnapshot) => void,
    private readonly onStatus: (status: string) => void,
    private readonly onNotice: (message: string, tone: NoticeTone) => void = () => {},
  ) {}

  get connected(): boolean {
    return this.joined;
  }

  connect(): void {
    this.disconnect();
    this.active = true;
    this.open();
  }

  private open(): void {
    if (!this.active) {
      return;
    }

    this.onStatus('正在连接房间');

    const socket = this.makeSocket(
      `${this.options.serverUrl.replace(/\/$/, '').replace(/^http/, 'ws')}/ws`,
    );

    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) {
        return;
      }

      this.lastPong = Date.now();
      this.send({
        type: 'hello',
        payload: {
          protocolVersion: PROTOCOL_VERSION,
          roomCode: this.options.roomCode,
          clientId: this.options.clientId,
          name: this.options.name,
          role: 'member',
          kind: 'browser',
        },
      });
      this.heartbeat = setInterval(() => {
        if (Date.now() - this.lastPong > DEFAULT_HEARTBEAT_TIMEOUT_MS) {
          socket.close();

          return;
        }

        this.send({ type: 'ping', payload: { clientTime: Date.now() } });
      }, DEFAULT_HEARTBEAT_INTERVAL_MS);
    };

    socket.onmessage = event => {
      if (this.socket !== socket) {
        return;
      }

      try {
        this.receive(JSON.parse(String(event.data)) as ServerMessage);
      } catch {
        this.onStatus('收到无法解析的房间消息');
      }
    };

    socket.onerror = () => {
      if (this.socket === socket) {
        this.joined = false;
        this.onStatus('无法连接服务器');
        this.onNotice('无法连接服务器', 'error');
      }
    };

    socket.onclose = () => {
      if (this.socket !== socket) {
        return;
      }

      clearInterval(this.heartbeat);
      this.socket = undefined;
      this.joined = false;

      if (this.active) {
        this.onStatus('连接中断，正在重连');
        this.onNotice('连接中断，正在重连', 'warning');
        this.reconnect = setTimeout(
          () => this.open(),
          Math.min(1_000 * 2 ** this.attempts++, 10_000),
        );
      }
    };
  }

  private receive(message: ServerMessage): void {
    switch (message.type) {
      case 'hello': {
        this.joined = true;
        this.attempts = 0;
        this.clockOffsetMs = message.payload.snapshot.playback.serverClock - Date.now();
        this.onStatus('已加入房间');
        this.onSnapshot(message.payload.snapshot);
        this.onNotice('已加入房间', 'success');
        this.send({ type: 'ping', payload: { clientTime: Date.now() } });
        break;
      }

      case 'pong': {
        this.lastPong = Date.now();
        this.clockOffsetMs = computeClockOffset(
          message.payload.clientTime,
          message.payload.serverTime,
          Date.now() - message.payload.clientTime,
        );
        break;
      }

      case 'snapshot':

      case 'sync': {
        this.onSnapshot(message.payload);
        break;
      }

      case 'member-joined': {
        this.onSnapshot(message.payload.snapshot);
        this.onNotice(`${message.payload.member.name} 加入了房间`, 'info');
        break;
      }

      case 'member-left': {
        this.onSnapshot(message.payload.snapshot);
        this.onNotice(`${message.payload.member.name} 离开了房间`, 'warning');
        break;
      }

      case 'error': {
        this.disconnect();
        this.onStatus(message.payload.message);
        this.onNotice(message.payload.message, 'error');
        break;
      }

      case 'control': {
        // 本阶段仅作为跟随成员；播放状态由房主的后续快照确认。
        break;
      }
    }
  }

  requestSync(): void {
    if (this.joined) {
      this.send({ type: 'control', payload: { action: { type: 'resync' } } });
    }
  }

  private send(message: ClientMessage): void {
    if (this.socket?.readyState === 1) {
      this.socket.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    this.active = false;
    clearInterval(this.heartbeat);
    clearTimeout(this.reconnect);
    this.send({ type: 'leave', payload: {} });
    const socket = this.socket;
    this.socket = undefined;
    this.joined = false;
    socket?.close();
  }
}
