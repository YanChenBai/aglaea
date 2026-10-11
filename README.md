<p align="center">
  <img width="200" src="./apps/web/public/brand/aglaea-head.png" alt="Aglaea" />
</p>

<h1 align="center">Aglaea 阿格莱亚</h1>

<p align="center">和朋友一起看 B 站，同步播放、暂停、进度与切集。</p>

<p align="center">
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-1.4.3-fbf0df?logo=bun&labelColor=0a1418" alt="Bun"></a>
  <a href="https://elysiajs.com"><img src="https://img.shields.io/badge/Elysia-WebSocket-8b5cf6?labelColor=0a1418" alt="Elysia"></a>
  <a href="https://vuejs.org"><img src="https://img.shields.io/badge/Vue-3.6_RC_Vapor-42b883?logo=vuedotjs&logoColor=white&labelColor=0a1418" alt="Vue"></a>
  <a href="https://wxt.dev"><img src="https://img.shields.io/badge/WXT-0.21-67d55e?labelColor=0a1418" alt="WXT"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white&labelColor=0a1418" alt="TypeScript"></a>
  <a href="https://viteplus.dev"><img src="https://img.shields.io/badge/Vite%2B-1.0-d8b46a?labelColor=0a1418" alt="Vite+"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-%E2%89%A5%2022.18-5fa04e?logo=nodedotjs&logoColor=white&labelColor=0a1418" alt="Node"></a>
</p>

## 功能

- **同步观影**：浏览器插件连接 B 站播放器，成员自动跟随房主进度。
- **手机遥控**：通过专属链接控制播放、进度、音量与网页全屏。
- **Android 播放**：输入房间码加入，在手机上跟随播放，详见 [手机端文档](./apps/mobile/README.md)。
- **自行部署**：Bun + Elysia 提供房间服务，Docker 同时托管服务端与网页。

> [!NOTE]
> 房间保存在内存中，服务重启后清空。插件依赖 B 站播放器的页面结构；Android 端目前仅支持 ARM64，后台与锁屏播放仍需真机验证。

## 使用

1. 在插件中填写服务端地址和昵称，创建房间或输入六位房间码加入。
2. 房主选择 B 站播放标签页，成员加入后自动打开并绑定房主视频。
3. 点击「手机遥控」复制链接，在手机浏览器打开即可控制对应播放器。

手机直接观看请安装 Android 应用，填写服务端地址、昵称和房间码。

## 开发

需要 Node ≥ 22.18、Bun 和 [Vite+](https://viteplus.dev)。

```bash
vp install
vp run @aglaea/shared#build
vp run @aglaea/client#build

# 在不同终端启动需要的应用
vp run @aglaea/server#dev
vp run @aglaea/web#dev
vp run @aglaea/extension#dev
vp run @aglaea/website#dev
```

服务端默认 `http://localhost:8787`，网页大厅 `http://localhost:5173`，官网 `http://localhost:5174`。插件开发产物位于 `apps/extension/.output/chrome-mv3`，通过浏览器扩展管理页加载。

| 目录                                             | 内容                               |
| ------------------------------------------------ | ---------------------------------- |
| [`apps/extension`](./apps/extension/README.md)   | WXT + Vue Vapor 浏览器插件         |
| [`apps/web`](./apps/web/README.md)               | 房间大厅与手机遥控页               |
| [`apps/server`](./apps/server/README.md)         | Bun + Elysia 房间与 WebSocket 服务 |
| [`apps/website`](./apps/website/README.md)       | 官网与 `/design` 设计规范          |
| [`apps/mobile`](./apps/mobile/README.md)         | NativeScript Vue Android 播放端    |
| [`packages/shared`](./packages/shared/README.md) | 协议、同步计算与令牌工具           |
| [`packages/client`](./packages/client/README.md) | 类型化 API 客户端与 Vue 入口       |
| [`packages/ui`](./packages/ui/README.md)         | 设计 token 与 Vue Vapor 基础组件   |

```bash
vp check
vp run typecheck
vp test
vp run build
```

Android 开发环境与 APK 构建见 [手机端开发说明](./apps/mobile/README.md#开发)。接口文档在服务启动后访问 `/openapi`，设计规范访问官网的 `/design`。

## 部署

```bash
cp .env.example .env
docker compose up -d --build
```

## 许可证

本项目为非官方同人向工具，采用 [MIT License](./LICENSE)。
