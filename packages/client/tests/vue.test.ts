import { expect, test, vi } from 'vite-plus/test';
import { computed, ref } from 'vue';

import { useClient } from '../src/vue.ts';

test('uses the latest reactive server address and retains client options', async () => {
  const serverUrl = ref('https://first.example/');

  const fetcher = Object.assign(
    vi.fn((_url: Parameters<typeof fetch>[0], _options?: Parameters<typeof fetch>[1]) =>
      Promise.resolve(Response.json({ ok: true })),
    ),
    {
      preconnect() {},
    },
  );

  const client = useClient(
    computed(() => serverUrl.value),
    {
      fetcher,
      headers: { 'x-client': 'aglaea' },
    },
  );

  const first = client.value;
  await client.value.health.get();
  expect(fetcher).toHaveBeenLastCalledWith(
    'https://first.example/health',
    expect.objectContaining({ headers: { 'x-client': 'aglaea' } }),
  );

  serverUrl.value = 'https://second.example';
  expect(client.value).not.toBe(first);
  await client.value.health.get();
  expect(fetcher).toHaveBeenLastCalledWith(
    'https://second.example/health',
    expect.objectContaining({ headers: { 'x-client': 'aglaea' } }),
  );

  const fromGetter = useClient(() => serverUrl.value, { fetcher });
  serverUrl.value = 'https://third.example';
  await fromGetter.value.health.get();
  expect(fetcher.mock.calls.at(-1)?.[0]).toBe('https://third.example/health');
});
