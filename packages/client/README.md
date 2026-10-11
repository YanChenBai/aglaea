<p align="center">
  <img width="200" src="../../apps/web/public/brand/aglaea-head.png" alt="Aglaea" />
</p>

<h1 align="center">@aglaea/client</h1>

<p align="center">从服务端类型推导 API，让网页与插件共享类型化客户端。</p>

<p align="center">
  <a href="https://elysiajs.com"><img src="https://img.shields.io/badge/Elysia-WebSocket-8b5cf6?labelColor=0a1418" alt="Elysia"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white&labelColor=0a1418" alt="TypeScript"></a>
  <a href="https://vuejs.org"><img src="https://img.shields.io/badge/Vue-3.6_RC_Vapor-42b883?logo=vuedotjs&logoColor=white&labelColor=0a1418" alt="Vue"></a>
</p>

基于 [Eden Treaty](https://elysiajs.com/eden/overview) 的类型化客户端。路由、请求参数和响应直接从 `@aglaea/server` 导出的 `AglaeaServer` 推导，服务端只通过 `import type` 引入。

## 使用

普通 TypeScript 环境：

```ts
import { createClient } from '@aglaea/client';

const client = createClient('http://localhost:8787');
const { data, error } = await client.api.rooms.post({ name: 'Aglaea' });

if (error) {
  throw new Error(error.value.message);
}

console.log(data.roomCode);
```

Vue 环境通过独立入口使用响应式地址，支持字符串、ref、computed 或 getter：

```ts
import { useClient } from '@aglaea/client/vue';
import { ref } from 'vue';

const serverUrl = ref('http://localhost:8787');
const client = useClient(serverUrl);

await client.value.api.rooms({ code: 'ABCDEF' }).get();
serverUrl.value = 'https://sync.example.com';
await client.value.api.rooms({ code: 'ABCDEF' }).get();
```

地址变化后，`client.value` 自动更新，后续请求使用新地址。已经发出的请求和已经建立的 WebSocket 连接继续使用原地址；连接切换由调用方负责。客户端不负责持久化地址，插件仍通过 `browser.storage.local` 保存配置。

两个入口均支持 Eden 的原生配置，调用直接返回 `{ data, error, status, response, headers }`。退出连接时可传入 `{ fetch: { keepalive: true } }`，Vue 入口不会被普通客户端入口加载。
