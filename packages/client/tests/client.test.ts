import { expect, test } from 'vite-plus/test';

import { createApp } from '../../../apps/server/src/app.ts';
import { readServerConfig } from '../../../apps/server/src/config.ts';
import { createClient } from '../src/index.ts';

function setup() {
  const app = createApp(readServerConfig({}));

  return createClient('http://localhost/', {
    fetcher: Object.assign(
      (url: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) =>
        app.handle(new Request(url, options)),
      { preconnect() {} },
    ),
  });
}

test('creates and queries a room through the typed server routes', async () => {
  const client = setup();
  const created = await client.api.rooms.post({ name: 'Alice' });
  expect(created.status).toBe(201);

  if (created.error) {
    throw created.error;
  }

  expect(created.data.ownerToken).toBeTruthy();
  const room = await client.api.rooms({ code: created.data.roomCode }).get();
  expect(room.error).toBeNull();
  expect(room.data?.snapshot.roomCode).toBe(created.data.roomCode);

  const forbidden = await client.api
    .rooms({ code: created.data.roomCode })
    .controllers.post({ clientId: 'missing-member' });

  expect(forbidden.data).toBeNull();
  expect(forbidden.error?.status).toBe(403);
});

test('returns server errors and validation failures through Eden', async () => {
  const client = setup();
  const missing = await client.api.rooms({ code: 'AAAAAA' }).get();
  expect(missing.data).toBeNull();
  expect(missing.error).toMatchObject({ status: 404, value: { error: 'ROOM_NOT_FOUND' } });

  const ticket = await client.api
    .rooms({ code: 'AAAAAA' })
    .controllers.post({ clientId: 'missing' });

  expect(ticket.error).toMatchObject({ status: 404, value: { error: 'ROOM_NOT_FOUND' } });

  const invalid = await client.api.rooms.post({ name: '' });
  expect(invalid.data).toBeNull();
  expect(invalid.error?.status).toBe(422);
});
