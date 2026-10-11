import type { ControllerTicket, JoinOptions, RoomRecord, RoomUserRecord } from './room-types.ts';

export function createRoomUser(
  room: RoomRecord,
  options: JoinOptions,
  ticket: ControllerTicket | undefined,
  now: number,
): RoomUserRecord {
  const existing = room.users.get(options.clientId);

  const user: RoomUserRecord = {
    clientId: options.clientId,
    name: ticket ? `${ticket.targetName} · 遥控` : options.name,
    role: options.role,
    kind: options.kind,
    joinedAt: existing?.joinedAt ?? now,
    lastSeenAt: now,
    connected: true,
    clockOffsetMs: existing?.clockOffsetMs ?? 0,
    ownerToken: options.role === 'owner' ? options.ownerToken : undefined,
    controllerToken: options.role === 'controller' ? ticket?.token : undefined,
    remoteTarget: ticket
      ? { clientId: ticket.ownerClientId, name: ticket.targetName, role: ticket.targetRole }
      : undefined,
  };

  return user;
}
