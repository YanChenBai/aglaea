<p align="center">
  <img width="200" src="../../apps/web/public/brand/aglaea-head.png" alt="Aglaea" />
</p>

<h1 align="center">@aglaea/shared</h1>

<p align="center">让各端使用同一套协议与播放同步计算。</p>

<p align="center">
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white&labelColor=0a1418" alt="TypeScript"></a>
  <a href="https://viteplus.dev"><img src="https://img.shields.io/badge/Vite%2B-1.0-d8b46a?labelColor=0a1418" alt="Vite+"></a>
</p>

Aglaea 各端共用的协议类型、Zod 校验与播放同步计算。包不依赖 Vue、浏览器或服务端运行时，通过构建后的 `dist` 导出。

## 使用

在 workspace 中添加 `"@aglaea/shared": "workspace:*"`，运行 `vp install` 并构建此包后引入：

```ts
import { decideSync, roomCodeSchema } from '@aglaea/shared';

const roomCode = roomCodeSchema.parse('abcdef');
const decision = decideSync(
  10,
  { position: 12, duration: 120, paused: false, playbackRate: 1 },
  500,
  1.25,
);

if (decision.shouldSeek) {
  // 将本地播放器跳转至 decision.targetPosition。
}
```

房间码会去除首尾空格并转为大写；只接受六位指定字母或数字。同步计算的进度与容差单位为秒，经过时间单位为毫秒。

## 导出

| 入口                                                             | 用途                               |
| ---------------------------------------------------------------- | ---------------------------------- |
| `RoomSnapshot`、`ClientMessage`、`ServerMessage`                 | 房间快照与 WebSocket 消息类型      |
| `clientMessageSchema`、`roomCodeSchema`、`playbackPayloadSchema` | 消息、房间码与播放器状态校验       |
| `projectPlayback`、`decideSync`                                  | 投影播放位置，判断是否超出跳转容差 |
| `computeClockOffset`                                             | 根据往返延迟估算服务端时钟偏移     |
| `makeRoomCode`、`makeToken`                                      | 生成房间码与令牌字符串             |

协议定义见 [`src/protocol.ts`](./src/protocol.ts)，同步算法见 [`src/sync.ts`](./src/sync.ts)。这些函数只计算目标状态，播放器操作由各应用负责。

## 开发

在仓库根目录运行：

```bash
vp run @aglaea/shared#build
vp run @aglaea/shared#typecheck
vp run @aglaea/shared#test
```

构建生成 `dist` 中的运行代码与类型声明。修改协议或同步逻辑后，重新构建再启动消费应用。
