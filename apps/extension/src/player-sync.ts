import { decideSync, SYNC_DRIFT_TOLERANCE_SECONDS, type PlaybackState } from '@aglaea/shared';

type SyncPlayer = Pick<
  HTMLVideoElement,
  'currentTime' | 'duration' | 'paused' | 'playbackRate' | 'readyState' | 'play' | 'pause'
>;

export async function applyPlayback(
  video: SyncPlayer,
  playback: PlaybackState,
  serverNow: number,
  forceSeek = false,
): Promise<boolean> {
  if (video.readyState < 1) {
    return false;
  }

  const decision = decideSync(
    video.currentTime,
    playback,
    serverNow - playback.updatedAt,
    SYNC_DRIFT_TOLERANCE_SECONDS,
  );

  let changed = false;

  if (decision.shouldSeek || ((forceSeek || playback.paused) && Math.abs(decision.drift) > 0.05)) {
    video.currentTime = Math.min(
      Number.isFinite(video.duration) && video.duration > 0 ? video.duration : Infinity,
      decision.targetPosition,
    );
    changed = true;
  }

  if (video.playbackRate !== playback.playbackRate) {
    video.playbackRate = playback.playbackRate;
    changed = true;
  }

  if (video.paused !== playback.paused) {
    changed = true;

    if (playback.paused) {
      video.pause();
    } else {
      await video.play();
    }
  }

  return changed;
}
