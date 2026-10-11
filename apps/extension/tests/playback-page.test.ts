import { expect, test } from 'vite-plus/test';

import { isPlaybackUrl, playbackPageKey, roomPlaybackUrl } from '../src/playback-page.ts';

test('only accepts Bilibili video and bangumi playback pages', () => {
  expect(isPlaybackUrl('https://www.bilibili.com/video/BV1X9Hj6dEkz/')).toBe(true);
  expect(
    isPlaybackUrl(
      'https://www.bilibili.com/bangumi/play/ep1396637?spm_id_from=333.337.search-card.all.click',
    ),
  ).toBe(true);

  for (const url of [
    'https://www.bilibili.com/',
    'https://www.bilibili.com/video/',
    'https://live.bilibili.com/123',
    'https://www.bilibili.com/read/cv123',
    'https://example.com/video/BVtest',
    'javascript:alert(1)',
  ]) {
    expect(isPlaybackUrl(url)).toBe(false);
  }
});

test('keeps bangumi episodes as bangumi URLs and ignores tracking parameters', () => {
  const url =
    'https://www.bilibili.com/bangumi/play/ep1396637?spm_id_from=333.337.search-card.all.click';

  expect(roomPlaybackUrl({ platform: 'bilibili', bvid: 'BVunderlying', url })).toBe(url);
  expect(playbackPageKey(url)).toBe(
    playbackPageKey('https://www.bilibili.com/bangumi/play/ep1396637'),
  );
  expect(playbackPageKey('https://www.bilibili.com/video/BVtest/?p=2')).not.toBe(
    playbackPageKey('https://www.bilibili.com/video/BVtest/'),
  );
});
