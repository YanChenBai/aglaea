import { roomCodeSchema } from '@aglaea/shared';

export interface RoomForm {
  serverUrl: string;
  name: string;
  roomCode: string;
}

export function normalizeRoomForm(value: RoomForm): RoomForm | undefined {
  const code = roomCodeSchema.safeParse(value.roomCode);
  const serverUrl = value.serverUrl.trim().replace(/\/$/, '');
  const name = value.name.trim();

  if (!code.success || !/^https?:\/\/[^\s]+$/.test(serverUrl) || !name || name.length > 24) {
    return;
  }

  return { serverUrl, name, roomCode: code.data };
}
