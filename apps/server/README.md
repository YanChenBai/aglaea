<p align="center">
  <img width="200" src="../../apps/web/public/brand/aglaea-head.png" alt="Aglaea" />
</p>

<h1 align="center">Aglaea Server</h1>

<p align="center">维护房间与播放状态，让所有成员跟随同一个节拍。</p>

<p align="center">
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-1.4.3-fbf0df?logo=bun&labelColor=0a1418" alt="Bun"></a>
  <a href="https://elysiajs.com"><img src="https://img.shields.io/badge/Elysia-WebSocket-8b5cf6?labelColor=0a1418" alt="Elysia"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white&labelColor=0a1418" alt="TypeScript"></a>
</p>

基于 Bun + Elysia 的房间同步服务。REST 管理房间与遥控链接，WebSocket 广播播放状态、控制事件与成员变化。

房主维护房间进度，成员跟随播放，遥控端操作绑定用户的播放器。房间保存在内存中，服务重启后清空。

## 开发

在仓库根目录运行：

```bash
vp install
vp run @aglaea/shared#build
vp run @aglaea/server#dev
```

默认监听 `http://localhost:8787`。开发模式自动重启服务，因此源码变更也会清空房间。

## 接口

| 方法   | 路径                           | 用途                                 |
| ------ | ------------------------------ | ------------------------------------ |
| `POST` | `/api/rooms`                   | 创建房间，返回房间码、房主令牌与快照 |
| `GET`  | `/api/rooms/:code`             | 查询房间快照                         |
| `POST` | `/api/rooms/:code/controllers` | 为已加入的用户生成遥控链接           |
| `POST` | `/api/rooms/:code/leave`       | 使用连接令牌退出对应连接             |
| `GET`  | `/health`                      | 查看协议版本、房间数量与运行时间     |
| `WS`   | `/ws`                          | 加入房间、同步播放与发送控制事件     |

启动后访问 `/openapi` 查看 REST 接口文档。WebSocket 首条消息为 `hello`，消息结构由 [`@aglaea/shared`](../../packages/shared/README.md) 定义。

## 配置

配置从进程环境变量读取，见 [`src/config.ts`](./src/config.ts)。

| 变量                 | 默认值                    | 用途                                   |
| -------------------- | ------------------------- | -------------------------------------- |
| `PORT`               | `8787`                    | 监听端口，未设置时回退到 `AGLAEA_PORT` |
| `HOST`               | `0.0.0.0`                 | 监听地址                               |
| `AGLAEA_PUBLIC_URL`  | `http://localhost:<端口>` | 启动日志中的对外地址                   |
| `AGLAEA_WEB_URL`     | `http://localhost:5173`   | 生成遥控链接使用的网页地址             |
| `AGLAEA_STATIC_ROOT` | 未设置                    | 设置后托管对应目录的静态网页           |

Docker 配置示例与启动步骤见 [根目录部署说明](../../README.md#部署)。部署时将 `AGLAEA_WEB_URL` 设置为手机可访问的网页地址。

## 验证与构建

```bash
vp run @aglaea/server#typecheck
vp run @aglaea/server#test
vp run @aglaea/server#build
```

构建产物为 `dist/index.js`，使用 `bun apps/server/dist/index.js` 启动。包导出的 `AglaeaServer` 仅用于类型推导，网页与插件通过 [`@aglaea/client`](../../packages/client/README.md) 调用接口。
