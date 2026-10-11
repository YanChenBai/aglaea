import { projectPlayback, type ControlAction } from '@aglaea/shared';

import type { RoomRecord } from './room-types.ts';

export function isLocalControl(action: ControlAction): boolean {
  return ['volume', 'fullscreen', 'resync'].includes(action.type);
}

export function applyRoomControl(
  playback: RoomRecord['playback'],
  action: ControlAction,
  now: number,
): RoomRecord['playback'] | undefined {
  const next = { ...playback, position: projectPlayback(playback, now - playback.updatedAt) };

  switch (action.type) {
    case 'play': {
      next.paused = false;
      break;
    }

    case 'pause': {
      next.paused = true;
      break;
    }

    case 'toggle': {
      next.paused = !playback.paused;
      break;
    }

    case 'seek': {
      next.position = action.position;
      break;
    }

    case 'skip': {
      next.position = Math.max(0, next.position + action.delta);
      break;
    }

    case 'rate': {
      next.playbackRate = action.playbackRate;
      break;
    }

    case 'next':
    case 'prev':
    case 'fullscreen':
    case 'volume':

    case 'resync': {
      // 这些动作由房主端播放器执行，服务端只负责转发。
      return undefined;
    }
  }

  return { ...next, updatedAt: now, source: 'manual' };
}
