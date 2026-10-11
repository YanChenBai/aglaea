import type {
  ControllerSessionResponse,
  CreateRoomResponse,
  RoomInfoResponse,
} from '@aglaea/shared';

export function resolveApiBase(): string {
  const params = new URLSearchParams(location.search);

  return (params.get('server') ?? '').replace(/\/$/, '');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${resolveApiBase()}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? `请求失败 (${response.status})`);
  }

  return payload as T;
}

export function useRoomApi() {
  function createRoom(name: string): Promise<CreateRoomResponse> {
    return request<CreateRoomResponse>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  function getRoom(roomCode: string): Promise<RoomInfoResponse> {
    return request<RoomInfoResponse>(`/api/rooms/${roomCode}`);
  }

  function createControllerSession(
    roomCode: string,
    clientId: string,
  ): Promise<ControllerSessionResponse> {
    return request<ControllerSessionResponse>(`/api/rooms/${roomCode}/controllers`, {
      method: 'POST',
      body: JSON.stringify({ clientId }),
    });
  }

  return { createRoom, getRoom, createControllerSession };
}
