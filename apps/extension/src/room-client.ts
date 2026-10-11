import {
  computeClockOffset,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  type ClientMessage,
  type ControlAction,
  type ServerMessage,
} from '@aglaea/shared';

import type { ExtensionConfig, PlayerSnapshot } from './messaging.ts';

export interface RoomClientHandlers {
  onMessage: (message: ServerMessage) => void;
  onStatus: (status: 'connecting' | 'connected' | 'error' | 'idle', error?: string) => void;
}

export class RoomClient {
  private socket?: WebSocket;

  private pingTimer?: ReturnType<typeof setInterval>;

  private lastPlayer?: PlayerSnapshot;

  private lastPlayerAt = 0;

  private lastPingAt = 0;

  private clockOffsetMs = 0;

  private joined = false;

  private reconnectTimer?: ReturnType<typeof setTimeout>;

  private reconnectAttempts = 0;

  constructor(
    private readonly config: ExtensionConfig,
    private readonly clientId: string,
    private readonly handlers: RoomClientHandlers,
  ) {}

  private clientRole(): 'owner' | 'controller' | 'member' {
    if (this.config.ownerToken) {
      return 'owner';
    }

    return this.config.controllerToken ? 'controller' : 'member';
  }

  connect(): void {
    if (!this.config.roomCode || !this.config.serverUrl) {
      this.handlers.onStatus('idle');

      return;
    }

    this.disconnect();
    this.handlers.onStatus('connecting');
    const url = this.buildSocketUrl();
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.addEventListener('open', () => {
      if (this.socket !== socket) {
        return;
      }

      this.send({
        type: 'hello',
        payload: {
          protocolVersion: 1,
          roomCode: this.config.roomCode!,
          clientId: this.clientId,
          name: this.config.name || 'Aglaea',
          role: this.clientRole(),
          kind: this.config.controllerToken ? 'remote' : 'browser',
          ownerToken: this.config.ownerToken,
          controllerToken: this.config.controllerToken,
          snapshot: this.lastPlayer,
        },
      });
    });
    socket.addEventListener('message', event => {
      if (this.socket !== socket) {
        return;
      }

      const message = JSON.parse(String(event.data)) as ServerMessage;

      if (message.type === 'hello') {
        this.joined = true;
        this.reconnectAttempts = 0;
        this.clockOffsetMs = message.payload.snapshot.playback.serverClock - Date.now();
        this.handlers.onStatus('connected');
        this.startHeartbeat();
      }

      if (message.type === 'pong') {
        const roundTrip = Date.now() - message.payload.clientTime;
        this.clockOffsetMs = computeClockOffset(
          message.payload.clientTime,
          message.payload.serverTime,
          roundTrip,
        );
      }

      if (message.type === 'error') {
        this.handlers.onStatus('error', message.payload.message);
      }

      this.handlers.onMessage(message);

      if (message.type === 'hello') {
        this.sendPlayerUpdate('tick');
      }
    });
    socket.addEventListener('error', () => {
      if (this.socket !== socket) {
        return;
      }

      this.handlers.onStatus('error', '无法连接同步服务器');
    });
    socket.addEventListener('close', () => {
      if (this.socket !== socket) {
        return;
      }

      this.joined = false;
      this.stopTimers();
      this.handlers.onStatus('connecting', '连接中断，正在自动重连');
      const delay = Math.min(1_000 * 2 ** this.reconnectAttempts++, 10_000);
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    });
  }

  setPlayerSnapshot(snapshot: PlayerSnapshot): void {
    this.lastPlayer = snapshot;
    this.lastPlayerAt = Date.now();
  }

  clearPlayerSnapshot(): void {
    this.lastPlayer = undefined;
    this.lastPlayerAt = 0;
  }

  sendPlayerUpdate(source: 'tick' | 'play' | 'pause' | 'seek' | 'ratechange' | 'episode'): void {
    if (!this.joined || !this.lastPlayer || !this.config.ownerToken) {
      return;
    }

    this.send({
      type: 'sync',
      payload: {
        position: this.lastPlayer.paused
          ? this.lastPlayer.position
          : Math.min(
              this.lastPlayer.duration || Infinity,
              this.lastPlayer.position +
                ((Date.now() - this.lastPlayerAt) / 1_000) * this.lastPlayer.playbackRate,
            ),
        duration: this.lastPlayer.duration,
        paused: this.lastPlayer.paused,
        playbackRate: this.lastPlayer.playbackRate,
        media: this.lastPlayer.media,
        source,
      },
    });
  }

  sendControl(action: ControlAction): void {
    if (!this.joined) {
      return;
    }

    this.send({ type: 'control', payload: { action } });
  }

  disconnect(): void {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.stopTimers();
    this.joined = false;
    const socket = this.socket;
    this.socket = undefined;
    socket?.close();
  }

  getClockOffsetMs(): number {
    return this.clockOffsetMs;
  }

  private startHeartbeat(): void {
    this.stopTimers();
    this.pingTimer = setInterval(() => {
      this.lastPingAt = Date.now();
      this.send({ type: 'ping', payload: { clientTime: this.lastPingAt } });
    }, DEFAULT_HEARTBEAT_INTERVAL_MS);
    this.send({ type: 'ping', payload: { clientTime: Date.now() } });
  }

  private stopTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }

    this.pingTimer = undefined;
  }

  private send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private buildSocketUrl(): string {
    const base = this.config.serverUrl.replace(/\/$/, '');
    const wsBase = base.replace(/^http/, 'ws');

    return `${wsBase}/ws`;
  }
}
