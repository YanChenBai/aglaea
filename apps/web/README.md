<p align="center">
  <img width="200" src="../../apps/web/public/brand/aglaea-head.png" alt="Aglaea" />
</p>

<h1 align="center">Aglaea Web</h1>

<p align="center">查看房间状态，在手机上遥控对应播放器。</p>

<p align="center">
  <a href="https://vuejs.org"><img src="https://img.shields.io/badge/Vue-3.6_RC_Vapor-42b883?logo=vuedotjs&logoColor=white&labelColor=0a1418" alt="Vue"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white&labelColor=0a1418" alt="TypeScript"></a>
  <a href="https://viteplus.dev"><img src="https://img.shields.io/badge/Vite%2B-1.0-d8b46a?labelColor=0a1418" alt="Vite+"></a>
</p>

Aglaea 的房间大厅与手机遥控页，使用 Vue Vapor 和共享 UI 组件。大厅提供房间创建与查询，遥控页通过专属令牌控制对应用户的播放器。

网页本身不播放 B 站视频。手机直接观看使用 [Android 应用](../mobile/README.md)。

## 使用

- **大厅**：打开 `/`，创建房间或输入六位房间码查询状态。
- **遥控**：在插件中点击「手机遥控」，打开生成的 `/remote.html?room=<房间码>&token=<遥控令牌>` 链接。

房主遥控端可调整房间播放状态与切集；成员遥控端可手动同步，并调整本机播放器音量与网页全屏。遥控链接在房间存续期间有效。

## 开发

在仓库根目录运行：

```bash
vp install
vp run @aglaea/shared#build
vp run @aglaea/client#build
vp run @aglaea/server#dev
```

在另一终端启动网页：

```bash
vp run @aglaea/web#dev
```

访问 `http://localhost:5173`。开发服务器将 `/api` 和 `/ws` 代理到 `localhost:8787`；页面默认使用同源服务，也可通过 `server` 查询参数指定服务端地址。

## 结构

| 入口                               | 用途                   |
| ---------------------------------- | ---------------------- |
| `index.html`、`src/main.ts`        | 房间大厅               |
| `remote.html`、`src/remote.ts`     | 手机遥控页             |
| `src/api.ts`                       | API 地址与类型化客户端 |
| `src/composables/useRoomSocket.ts` | WebSocket 房间连接     |

页面通过 [`@aglaea/client`](../../packages/client/README.md) 调用接口，样式与基础组件由 [`@aglaea/ui`](../../packages/ui/README.md) 提供。

## 验证与部署

```bash
vp run @aglaea/web#typecheck
vp run @aglaea/web#build
vp run @aglaea/web#preview
```

构建输出到 `dist`，包含大厅和 `remote.html` 两个入口。可通过根目录 Docker 配置一起部署；独立托管时将 `/api` 和 `/ws` 代理到同步服务，并将服务端 `AGLAEA_WEB_URL` 设置为此网页的对外地址。
