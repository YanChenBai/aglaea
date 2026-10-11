import type { PlaybackPayload } from './protocol.ts';

export interface SyncDecision {
  shouldSeek: boolean;
  targetPosition: number;
  drift: number;
}

export function projectPlayback(
  playback: Pick<PlaybackPayload, 'position' | 'duration' | 'paused' | 'playbackRate'>,
  elapsedMs: number,
): number {
  const elapsedSeconds = playback.paused
    ? 0
    : (Math.max(0, elapsedMs) / 1_000) * playback.playbackRate;

  const duration =
    Number.isFinite(playback.duration) && playback.duration > 0
      ? playback.duration
      : Number.POSITIVE_INFINITY;

  return Math.min(duration, Math.max(0, playback.position + elapsedSeconds));
}

export function decideSync(
  localPosition: number,
  remote: Pick<PlaybackPayload, 'position' | 'duration' | 'paused' | 'playbackRate'>,
  elapsedMs: number,
  toleranceSeconds: number,
): SyncDecision {
  const targetPosition = projectPlayback(remote, elapsedMs);
  const drift = targetPosition - localPosition;

  return {
    shouldSeek: Math.abs(drift) > toleranceSeconds,
    targetPosition,
    drift,
  };
}

export function computeClockOffset(
  clientTime: number,
  serverTime: number,
  roundTripMs: number,
): number {
  return serverTime - (clientTime + Math.max(0, roundTripMs) / 2);
}

export function makeRoomCode(random: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(random() * alphabet.length)] ?? 'A';
  }

  return code;
}

export function makeToken(byteLength = 24, random: () => number = Math.random): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let value = '';

  for (let index = 0; index < byteLength; index += 1) {
    value += alphabet[Math.floor(random() * alphabet.length)] ?? '0';
  }

  return value;
}
