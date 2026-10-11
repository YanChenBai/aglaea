import type { RoomMedia } from '@aglaea/shared';

export const playbackMatches = [
  'https://www.bilibili.com/video/*',
  'https://www.bilibili.com/bangumi/play/*',
];

export function isPlaybackUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.origin === 'https://www.bilibili.com' &&
      /^\/(?:video\/BV\w+|bangumi\/play\/(?:ep|ss)\d+)\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function roomPlaybackUrl(media: RoomMedia): string | undefined {
  if (isPlaybackUrl(media.url)) {
    return media.url;
  }

  if (media.bvid && /^BV\w+$/.test(media.bvid)) {
    return `https://www.bilibili.com/video/${media.bvid}/?p=${(media.episodeIndex ?? 0) + 1}`;
  }

  return undefined;
}

export function playbackPageKey(value: string): string {
  const url = new URL(value);
  const path = url.pathname.replace(/\/$/, '');

  return path.startsWith('/video/') ? `${path}?p=${url.searchParams.get('p') ?? '1'}` : path;
}
