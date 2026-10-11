import { WebSocket } from '@valor/nativescript-websockets/websocket';

import type { RoomSocket } from './session';

export function makeSocket(url: string): RoomSocket {
  const native = new WebSocket(url, [], {
    headers: {},
    nativescript: { handleThreading: true },
  });

  const socket: RoomSocket = {
    get readyState() {
      return native.readyState;
    },
    send: data => native.send(data),
    close: () => native.close(),
  };

  native.onopen = (event: unknown) => socket.onopen?.(event);
  native.onmessage = (event: { data: unknown }) => socket.onmessage?.(event);
  native.onclose = (event: unknown) => socket.onclose?.(event);
  native.onerror = (event: unknown) => socket.onerror?.(event);

  return socket;
}
