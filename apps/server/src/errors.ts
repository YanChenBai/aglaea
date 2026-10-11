import type { ServerMessage } from '@aglaea/shared';

import { RoomError } from './room-manager.ts';

export function roomError(error: unknown): Extract<ServerMessage, { type: 'error' }> {
  if (error instanceof RoomError) {
    return { type: 'error', payload: { code: error.code, message: error.message } };
  }

  return {
    type: 'error',
    payload: {
      code: 'INTERNAL',
      message: error instanceof Error ? error.message : 'Unexpected room error',
    },
  };
}
