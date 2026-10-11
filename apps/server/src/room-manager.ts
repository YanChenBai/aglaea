import {
  DEFAULT_ROOM_TTL_MS,
  DEFAULT_SYNC_INTERVAL_MS,
  makeRoomCode,
  makeToken,
  type ControlAction,
  type ControllerSessionResponse,
  type MemberView,
  type PlaybackPayload,
  type RoomSnapshot,
  type SyncSource,
} from '@aglaea/shared';

import { applyRoomControl, isLocalControl } from './playback.ts';
import type { ControllerTicket, JoinOptions, RoomRecord, RoomUserRecord } from './room-types.ts';
import { createRoomUser } from './room-user.ts';

export type { ControllerTicket, JoinOptions, RoomRecord, RoomUserRecord } from './room-types.ts';

// 空房宽限期：房主创建房间后可能先打开播放页，再让房间绑定 WebSocket。
const EMPTY_ROOM_GRACE_MS = 2_000;

export class RoomError extends Error {
  constructor(
    readonly code: 'ROOM_NOT_FOUND' | 'ROOM_EXPIRED' | 'BAD_TOKEN' | 'FORBIDDEN' | 'INVALID_TICKET',
    message: string,
  ) {
    super(message);
    this.name = 'RoomError';
  }
}

interface RoomManagerOptions {
  roomTtlMs?: number;
  ticketTtlMs?: number;
  now?: () => number;
  random?: () => number;
}

export class RoomManager {
  private readonly rooms = new Map<string, RoomRecord>();

  private readonly tickets = new Map<string, ControllerTicket>();

  private readonly roomTtlMs: number;

  private readonly ticketTtlMs?: number;

  private readonly now: () => number;

  private readonly random: () => number;

  constructor(options: RoomManagerOptions = {}) {
    this.roomTtlMs = options.roomTtlMs ?? DEFAULT_ROOM_TTL_MS;
    this.ticketTtlMs = options.ticketTtlMs;
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
  }

  createRoom(): { room: RoomRecord; ownerToken: string } {
    this.pruneExpired();
    let code = makeRoomCode(this.random);

    while (this.rooms.has(code)) {
      code = makeRoomCode(this.random);
    }

    const now = this.now();
    const ownerToken = makeToken(32, this.random);

    const room: RoomRecord = {
      code,
      ownerToken,
      createdAt: now,
      updatedAt: now,
      round: 0,
      users: new Map(),
      controllerTokens: new Map(),
      hasJoined: false,
      playback: {
        position: 0,
        duration: 0,
        paused: true,
        playbackRate: 1,
        media: { platform: 'bilibili' },
        updatedAt: now,
        source: 'manual',
      },
    };

    // 房主在真正打开插件页后由 WebSocket hello 绑定，这里只创建空房间。
    this.rooms.set(code, room);

    return { room, ownerToken };
  }

  getRoom(roomCode: string): RoomRecord {
    this.pruneExpired();
    const room = this.rooms.get(roomCode);

    if (!room) {
      throw new RoomError('ROOM_NOT_FOUND', `Room ${roomCode} was not found`);
    }

    return room;
  }

  peekRoom(roomCode: string): RoomRecord | undefined {
    this.pruneExpired();

    return this.rooms.get(roomCode);
  }

  join(options: JoinOptions): { room: RoomRecord; user: RoomUserRecord; snapshot: RoomSnapshot } {
    const room = this.getRoom(options.roomCode);
    const ticket = this.authorizeJoin(room, options);
    const isOwner = options.role === 'owner';
    const now = this.now();
    const user = createRoomUser(room, options, ticket, now);
    room.users.set(options.clientId, user);
    room.hasJoined = true;
    room.updatedAt = now;

    if (isOwner) {
      for (const other of room.users.values()) {
        if (other.role === 'owner' && other.clientId !== user.clientId) {
          room.users.delete(other.clientId);
        }
      }
    }

    return { room, user, snapshot: this.snapshot(room) };
  }

  private authorizeJoin(room: RoomRecord, options: JoinOptions): ControllerTicket | undefined {
    const isController = options.role === 'controller';

    if (options.role === 'owner' && options.ownerToken !== room.ownerToken) {
      throw new RoomError('BAD_TOKEN', 'Owner token is invalid');
    }

    let ticket: ControllerTicket | undefined;

    if (isController) {
      if (!options.controllerToken) {
        throw new RoomError('INVALID_TICKET', 'Controller token is required');
      }

      ticket = this.tickets.get(options.controllerToken);

      if (
        !ticket ||
        (ticket.expiresAt !== null && ticket.expiresAt <= this.now()) ||
        ticket.roomCode !== room.code
      ) {
        throw new RoomError('INVALID_TICKET', 'Controller token is invalid or expired');
      }
    }

    return ticket;
  }

  leave(
    roomCode: string,
    clientId: string,
  ): { room: RoomRecord; user: RoomUserRecord | undefined } {
    const room = this.getRoom(roomCode);
    const user = room.users.get(clientId);

    if (user) {
      room.users.delete(clientId);
      room.updatedAt = this.now();
    }

    return { room, user };
  }

  markSeen(roomCode: string, clientId: string, clockOffsetMs?: number): void {
    const room = this.getRoom(roomCode);
    const user = room.users.get(clientId);

    if (!user) {
      return;
    }

    user.lastSeenAt = this.now();
    user.connected = true;

    if (typeof clockOffsetMs === 'number' && Number.isFinite(clockOffsetMs)) {
      user.clockOffsetMs = clockOffsetMs;
    }
  }

  markDisconnected(roomCode: string, clientId: string): RoomUserRecord | undefined {
    const room = this.peekRoom(roomCode);
    const user = room?.users.get(clientId);

    if (user) {
      user.connected = false;
      user.lastSeenAt = this.now();
    }

    return user;
  }

  applyPlayback(
    roomCode: string,
    clientId: string,
    payload: PlaybackPayload & { source?: SyncSource },
  ): RoomSnapshot {
    const room = this.getRoom(roomCode);
    const user = room.users.get(clientId);

    if (!user) {
      throw new RoomError('FORBIDDEN', 'Client is not a room member');
    }

    const now = this.now();
    const canControl = user.role === 'owner';

    if (!canControl) {
      // 成员的周期采样不能覆盖房主维护的房间播放状态。
      if (payload.source === 'tick' || payload.source === 'join') {
        return this.snapshot(room);
      }

      throw new RoomError('FORBIDDEN', 'Only the owner or a controller can change playback state');
    }

    room.playback = {
      position: Math.max(0, payload.position),
      duration: Math.max(0, payload.duration),
      paused: payload.paused,
      playbackRate: payload.playbackRate,
      media: payload.media ?? room.playback.media,
      updatedAt: now,
      source: payload.source ?? 'manual',
    };
    room.updatedAt = now;
    room.round += 1;

    return this.snapshot(room);
  }

  applyControl(roomCode: string, clientId: string, action: ControlAction): RoomSnapshot {
    const room = this.getRoom(roomCode);
    const user = room.users.get(clientId);
    this.controlTarget(roomCode, clientId, action);

    if (user?.remoteTarget?.role === 'member' || user?.role === 'member') {
      return this.snapshot(room);
    }

    const now = this.now();
    const next = applyRoomControl(room.playback, action, now);

    if (next) {
      room.playback = next;
      room.updatedAt = now;
      room.round += 1;
    }

    return this.snapshot(room);
  }

  controlTarget(roomCode: string, clientId: string, action: ControlAction): string {
    const room = this.getRoom(roomCode);
    const user = room.users.get(clientId);

    if (!user) {
      throw new RoomError('FORBIDDEN', 'Client is not a room member');
    }

    const role = user.remoteTarget?.role ?? user.role;

    if (role !== 'owner' && !isLocalControl(action)) {
      throw new RoomError('FORBIDDEN', '成员只能调整自己的音量、全屏或对齐房主进度');
    }

    const targetId = user.remoteTarget?.clientId ?? user.clientId;
    const target = room.users.get(targetId);

    if (!target?.connected || target.kind !== 'browser' || target.role !== role) {
      throw new RoomError('FORBIDDEN', '对应的播放器尚未连接，请等待自动重连');
    }

    return targetId;
  }

  createControllerTicket(
    roomCode: string,
    ownerClientId: string,
    baseUrl: string,
  ): ControllerSessionResponse {
    const room = this.getRoom(roomCode);
    const owner = room.users.get(ownerClientId);

    if (!owner || owner.kind !== 'browser' || (owner.role !== 'owner' && owner.role !== 'member')) {
      throw new RoomError('FORBIDDEN', 'Only a browser player can create a controller link');
    }

    const now = this.now();
    const existingToken = room.controllerTokens.get(ownerClientId);
    let ticket = existingToken ? this.tickets.get(existingToken) : undefined;

    if (!ticket || (ticket.expiresAt !== null && ticket.expiresAt <= now)) {
      if (existingToken) {
        this.tickets.delete(existingToken);
      }

      ticket = {
        token: makeToken(32, this.random),
        roomCode,
        ownerClientId,
        targetName: owner.name,
        targetRole: owner.role,
        createdAt: now,
        expiresAt: this.ticketTtlMs === undefined ? null : now + this.ticketTtlMs,
      };
      this.tickets.set(ticket.token, ticket);
      room.controllerTokens.set(ownerClientId, ticket.token);
    }

    ticket.targetName = owner.name;
    ticket.targetRole = owner.role;

    return {
      controllerToken: ticket.token,
      controlUrl: `${baseUrl.replace(/\/$/, '')}/remote.html?room=${room.code}&token=${ticket.token}`,
      roomCode: room.code,
      expiresAt: ticket.expiresAt,
    };
  }

  resolveControllerTicket(token: string): ControllerTicket | undefined {
    const ticket = this.tickets.get(token);

    if (
      !ticket ||
      (ticket.expiresAt !== null && ticket.expiresAt <= this.now()) ||
      !this.peekRoom(ticket.roomCode)
    ) {
      return undefined;
    }

    return ticket;
  }

  snapshot(room: RoomRecord): RoomSnapshot {
    const members = [...room.users.values()]
      .filter(user => user.connected)
      .map<MemberView>(user => ({
        clientId: user.clientId,
        name: user.name,
        role: user.role,
        kind: user.kind,
        joinedAt: user.joinedAt,
        remoteTarget: user.remoteTarget,
      }));

    return {
      roomCode: room.code,
      round: room.round,
      ownerName: members.find(member => member.role === 'owner')?.name,
      media: room.playback.media,
      playback: {
        position: room.playback.position,
        duration: room.playback.duration,
        paused: room.playback.paused,
        playbackRate: room.playback.playbackRate,
        updatedAt: room.playback.updatedAt,
        serverClock: this.now(),
      },
      members,
      updatedAt: room.updatedAt,
    };
  }

  getSyncIntervalMs(): number {
    return DEFAULT_SYNC_INTERVAL_MS;
  }

  pruneExpired(): void {
    const now = this.now();

    for (const [code, room] of this.rooms) {
      const hasConnected = [...room.users.values()].some(user => user.connected);
      // 从未有人进入过的房间给一个短宽限期，绑定完成后才按 TTL 回收。
      const hasEverHadMembers = room.hasJoined;
      const idleSince = hasEverHadMembers ? room.updatedAt : room.createdAt;
      const ttl = hasEverHadMembers ? this.roomTtlMs : EMPTY_ROOM_GRACE_MS;

      if (!hasConnected && now - idleSince > ttl) {
        this.rooms.delete(code);
      }
    }

    for (const [token, ticket] of this.tickets) {
      if (
        (ticket.expiresAt !== null && ticket.expiresAt <= now) ||
        !this.rooms.has(ticket.roomCode)
      ) {
        this.tickets.delete(token);
      }
    }
  }

  roomCount(): number {
    this.pruneExpired();

    return this.rooms.size;
  }
}
