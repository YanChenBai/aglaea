import { describe, expect, test } from 'vite-plus/test';

import { RoomError, RoomManager } from '../src/room-manager.ts';

function createManager() {
  let now = 1_700_000_000_000;
  let seed = 0;

  const manager = new RoomManager({
    now: () => now,
    random: () => {
      seed += 1;

      return (seed % 97) / 97;
    },
    roomTtlMs: 1_000,
    ticketTtlMs: 5_000,
  });

  return {
    manager,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('RoomManager', () => {
  test('binds member remote controls to their player and rejects shared playback changes', () => {
    const { manager } = createManager();
    const { room, ownerToken } = manager.createRoom();
    manager.join({
      roomCode: room.code,
      clientId: 'owner',
      name: 'Owner',
      role: 'owner',
      kind: 'browser',
      ownerToken,
    });
    manager.join({
      roomCode: room.code,
      clientId: 'member',
      name: 'Alice',
      role: 'member',
      kind: 'browser',
    });
    const ticket = manager.createControllerTicket(room.code, 'member', 'https://remote.example');

    const remote = manager.join({
      roomCode: room.code,
      clientId: 'remote',
      name: 'Spoofed owner',
      role: 'controller',
      kind: 'remote',
      controllerToken: ticket.controllerToken,
    });

    expect(remote.user.remoteTarget).toEqual({ clientId: 'member', name: 'Alice', role: 'member' });
    expect(remote.user.name).toBe('Alice · 遥控');

    for (const action of [
      { type: 'volume', volume: 0.4 },
      { type: 'fullscreen', enabled: true },
      { type: 'resync' },
    ] as const) {
      expect(manager.controlTarget(room.code, 'remote', action)).toBe('member');
      expect(manager.applyControl(room.code, 'remote', action).round).toBe(0);
    }

    for (const action of [
      { type: 'seek', position: 42 },
      { type: 'pause' },
      { type: 'next' },
    ] as const) {
      expect(() => manager.applyControl(room.code, 'remote', action)).toThrow(RoomError);
    }

    expect(() =>
      manager.applyPlayback(room.code, 'remote', {
        position: 42,
        duration: 100,
        paused: false,
        playbackRate: 1,
        source: 'seek',
      }),
    ).toThrow(RoomError);
    manager.markDisconnected(room.code, 'member');
    expect(() => manager.controlTarget(room.code, 'remote', { type: 'volume', volume: 1 })).toThrow(
      RoomError,
    );
    manager.join({
      roomCode: room.code,
      clientId: 'member',
      name: 'Alice',
      role: 'member',
      kind: 'browser',
    });
    expect(manager.controlTarget(room.code, 'remote', { type: 'volume', volume: 1 })).toBe(
      'member',
    );
  });
  test('preserves the room and long-lived controller link across owner navigation', () => {
    let now = 1_700_000_000_000;
    const manager = new RoomManager({ now: () => now });
    const { room, ownerToken } = manager.createRoom();

    const owner = {
      roomCode: room.code,
      clientId: 'owner',
      name: 'Owner',
      role: 'owner' as const,
      kind: 'browser' as const,
      ownerToken,
    };

    manager.join(owner);
    const ticket = manager.createControllerTicket(room.code, 'owner', 'https://remote.example');
    expect(ticket.expiresAt).toBeNull();
    now += 2 * 60 * 60 * 1_000;
    expect(manager.resolveControllerTicket(ticket.controllerToken)).toBeDefined();
    manager.leave(room.code, 'owner');
    now += 5_000;
    manager.join(owner);
    expect(manager.resolveControllerTicket(ticket.controllerToken)).toBeDefined();
    expect(manager.createControllerTicket(room.code, 'owner', 'https://remote.example')).toEqual(
      ticket,
    );

    const joined = manager.join({
      roomCode: room.code,
      clientId: 'remote',
      name: 'Remote',
      role: 'controller',
      kind: 'remote',
      controllerToken: ticket.controllerToken,
    });

    expect(joined.user.role).toBe('controller');
  });
  test('creates a room and assigns an owner token', () => {
    const { manager } = createManager();
    const { room, ownerToken } = manager.createRoom();

    expect(room.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(ownerToken).toHaveLength(32);
    expect(manager.snapshot(room).members).toHaveLength(0);
  });

  test("reuses each user's token within a room and isolates tokens across users and rooms", () => {
    const { manager, advance } = createManager();
    const { room, ownerToken } = manager.createRoom();
    manager.join({
      roomCode: room.code,
      clientId: 'owner',
      name: 'Owner',
      role: 'owner',
      kind: 'browser',
      ownerToken,
    });
    manager.join({
      roomCode: room.code,
      clientId: 'member',
      name: 'Member',
      role: 'member',
      kind: 'browser',
    });
    const owner = manager.createControllerTicket(room.code, 'owner', 'https://remote.example');
    const member = manager.createControllerTicket(room.code, 'member', 'https://remote.example');
    expect(manager.createControllerTicket(room.code, 'owner', 'https://remote.example')).toEqual(
      owner,
    );
    expect(manager.createControllerTicket(room.code, 'member', 'https://remote.example')).toEqual(
      member,
    );
    expect(member.controllerToken).not.toBe(owner.controllerToken);
    const other = manager.createRoom().room;
    manager.join({
      roomCode: other.code,
      clientId: 'member',
      name: 'Member',
      role: 'member',
      kind: 'browser',
    });
    expect(
      manager.createControllerTicket(other.code, 'member', 'https://remote.example')
        .controllerToken,
    ).not.toBe(member.controllerToken);
    advance(5_001);
    const renewed = manager.createControllerTicket(room.code, 'member', 'https://remote.example');
    expect(renewed.controllerToken).not.toBe(member.controllerToken);
    expect(manager.resolveControllerTicket(member.controllerToken)).toBeUndefined();
    manager.leave(room.code, 'owner');
    manager.leave(room.code, 'member');
    advance(1_001);
    expect(manager.resolveControllerTicket(renewed.controllerToken)).toBeUndefined();
  });

  test('rejects an invalid owner token', () => {
    const { manager } = createManager();
    const { room } = manager.createRoom();

    expect(() =>
      manager.join({
        roomCode: room.code,
        clientId: 'owner-1',
        name: 'Hera',
        role: 'owner',
        kind: 'browser',
        ownerToken: 'wrong',
      }),
    ).toThrow(RoomError);
  });

  test('lets a controller ticket control playback but not create rooms', () => {
    const { manager } = createManager();
    const { room, ownerToken } = manager.createRoom();
    manager.join({
      roomCode: room.code,
      clientId: 'owner-1',
      name: 'Hera',
      role: 'owner',
      kind: 'browser',
      ownerToken,
    });

    const ticket = manager.createControllerTicket(room.code, 'owner-1', 'https://remote.example');
    expect(ticket.controlUrl).toContain('/remote.html?room=');

    manager.join({
      roomCode: room.code,
      clientId: 'remote-1',
      name: 'Remote',
      role: 'controller',
      kind: 'remote',
      controllerToken: ticket.controllerToken,
    });

    const snapshot = manager.applyControl(room.code, 'remote-1', { type: 'seek', position: 42 });
    expect(snapshot.playback.position).toBe(42);
  });

  test('does not allow regular members to force playback state', () => {
    const { manager } = createManager();
    const { room, ownerToken } = manager.createRoom();
    manager.join({
      roomCode: room.code,
      clientId: 'owner-1',
      name: 'Hera',
      role: 'owner',
      kind: 'browser',
      ownerToken,
    });
    manager.join({
      roomCode: room.code,
      clientId: 'member-1',
      name: 'Member',
      role: 'member',
      kind: 'browser',
    });

    expect(() =>
      manager.applyPlayback(room.code, 'member-1', {
        position: 50,
        duration: 100,
        paused: false,
        playbackRate: 1,
        source: 'seek',
      }),
    ).toThrow(RoomError);

    expect(() =>
      manager.applyPlayback(room.code, 'member-1', {
        position: 50,
        duration: 100,
        paused: false,
        playbackRate: 1,
        source: 'tick',
      }),
    ).not.toThrow();
    const unchanged = manager.snapshot(room);
    expect(unchanged.playback.position).toBe(0);
    expect(unchanged.playback.paused).toBe(true);
    expect(unchanged.round).toBe(0);
  });

  test('prunes rooms after the TTL only when nobody is connected', () => {
    const { manager, advance } = createManager();
    const { room, ownerToken } = manager.createRoom();

    advance(1_500);
    expect(manager.roomCount()).toBe(1);

    manager.join({
      roomCode: room.code,
      clientId: 'owner-1',
      name: 'Hera',
      role: 'owner',
      kind: 'browser',
      ownerToken,
    });
    advance(1_500);
    expect(manager.roomCount()).toBe(1);

    manager.markDisconnected(room.code, 'owner-1');
    advance(1_500);
    expect(manager.roomCount()).toBe(0);
  });
});
