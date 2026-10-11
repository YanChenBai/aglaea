<p align="center">
  <img width="200" src="./apps/web/public/brand/aglaea-head.png" alt="Aglaea" />
</p>

<h1 align="center">Aglaea 阿格莱亚</h1>

<p align="center">让 B 站进度条同步到同一个房间：插件读取播放器状态，服务端维护房间与时钟，成员端按统一节拍校准进度。</p>

<p align="center">
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-1.4.3-fbf0df?logo=bun&labelColor=0a1418" alt="Bun"></a>
  <a href="https://elysiajs.com"><img src="https://img.shields.io/badge/Elysia-WebSocket-8b5cf6?labelColor=0a1418" alt="Elysia"></a>
  <a href="https://vuejs.org"><img src="https://img.shields.io/badge/Vue-3.6_RC_Vapor-42b883?logo=vuedotjs&logoColor=white&labelColor=0a1418" alt="Vue"></a>
  <a href="https://wxt.dev"><img src="https://img.shields.io/badge/WXT-0.21-67d55e?labelColor=0a1418" alt="WXT"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white&labelColor=0a1418" alt="TypeScript"></a>
  <a href="https://viteplus.dev"><img src="https://img.shields.io/badge/Vite%2B-1.0-d8b46a?labelColor=0a1418" alt="Vite+"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-%E2%89%A5%2022.18-5fa04e?logo=nodedotjs&logoColor=white&labelColor=0a1418" alt="Node"></a>
</p>

> [!NOTE]
> 这是首个可运行版本。房间全部保存在服务端内存里，进程重启即清空；插件直接读取 B 站播放器的 DOM 与页面全局对象，这部分耦合会随 B 站前端版本变化。

## 这是什么

和异地朋友一起看 B 站时，真正麻烦的不是传链接，而是**上面那条进度条**：谁暂停了、谁拖到了哪、这集换没换，全靠口头对齐。Aglaea 把这件事做成几个部分：

- **浏览器插件**在 B 站视频页读取 `<video>` 与播放器实例，把进度、暂停、倍速、切集等信息持续上报。
- **同步服务**用内存保存房间、成员与播放快照，并广播控制事件。
- **手机遥控页**通过房间遥控令牌加入房间，负责播控，不参与播放本身。
- **Android 手机端**通过六位房间码作为成员加入，在 WebView 中播放 B 站视频，跟随房主进度。开发与使用说明见 [手机端文档](./apps/mobile/README.md)。

切集、暂停、播放、网页全屏等动作只在房主端真正执行，其他成员按上报的状态做漂移校准，房间因此始终只有一个「节拍」。

## 功能特性

- **持续同步**：插件每秒采样一次播放器并立即上报房主进度；播放、暂停、拖动与倍速事件立即同步。成员按房主状态校准，不覆盖房间进度。
- **时钟对齐**：客户端通过心跳估算与服务端的时钟偏移，用服务器时间投影播放位置，避免各自按本地时间跑偏；`packages/shared` 提供按漂移容差判断是否需要跳转的 `decideSync`。
- **三档角色**：`owner` 控制房间进度，`member` 跟随房主，`controller` 通过绑定用户的遥控令牌操作对应播放器。
- **手机遥控**：房主和成员都可生成长期遥控链接，页面显示用户名称与身份。成员可手动对齐房主进度，并调整自己播放器的音量和网页全屏；房主还能控制播放、进度与切集。同一房间内每个用户复用自己的遥控令牌，点击「手机遥控」直接复制链接。链接在房间存续期间有效，切集与短暂断线不会使链接失效。
- **Android 播放**：NativeScript Vue 提供原生房间界面，支持桌面播放页、默认 50% 缩放、沉浸式全屏、成员与日志模态框，以及通知栏媒体卡片和本机播放/暂停。当前仅支持 ARM64 成员端，后台与锁屏持续播放仍需进一步真机验证。
- **跳转同步**：房主调整播放进度时，通过播放器事件立即同步到成员。
- **自动回收**：房间按 TTL 清理（默认 12 小时），从未绑定成功的空房间只保留 2 秒宽限。
- **在线状态**：各端每 15 秒发送心跳，服务端每 15 秒检查连接，90 秒没有收到消息便移除成员并广播最新列表。网页关闭时通过 `leave` 和 `fetch keepalive` 主动退出，关闭插件绑定的播放标签页也会退出房间；客户端长时间收不到心跳回应时会自动重连。

## 架构

```text
浏览器插件 (WXT + Vue Vapor)                网页 / 手机遥控 / Android 播放端
        │ WebSocket /ws                             │ WebSocket /ws
        └──────────────┬──────────────────────────────┘
                       ▼
        Bun + Elysia 服务端
          REST  /api/rooms、/api/rooms/:code/controllers
          广播  /ws：hello、sync、control、ping
                       │
                       ▼
        packages/shared：Zod 协议、同步计算、房间号与令牌工具
```

```text
apps/
  extension/   WXT + Vue 3.6 RC (Vapor) 的 B 站插件，图标见 public/icons/
  website/     官网与介绍页（Vue Vapor）：功能、工作原理、使用流程、自部署与 `/design` 设计规范
  web/         房间大厅与手机遥控页（Vue Vapor），品牌图见 public/brand/
  server/      Bun + Elysia + WebSocket 的内存房间服务
  mobile/      NativeScript Vue Android 播放端，WebView 跟随房间同步
packages/
  client/      Eden Treaty 类型化客户端，提供响应式 Vue 入口
  shared/      Zod 协议、同步计算、房间号与令牌工具
  ui/          设计 token 与 Vue Vapor 基础组件，直接导出源码
```

## 开发

UI 基础组件由 [`@aglaea/ui`](./packages/ui/README.md) 提供，通过 `workspace:*` 直接引用源码，由应用编译。所有 workspace 的 TypeScript 版本统一在根目录 catalog 中管理，当前使用 TypeScript 6。

网页与插件通过 [`@aglaea/client`](./packages/client/README.md) 调用 API，类型直接从服务端实例推导。Vue 的 `useClient(serverUrl)` 支持响应式切换地址；插件服务器地址在保存配置时写入 `browser.storage.local`，后台重启后自动恢复。

```bash
vp install

# 首次开发前生成 shared 与 client 的运行代码和类型
vp run @aglaea/shared#build
vp run @aglaea/client#build

# 并行启动所有 workspace 的 dev（包含 Android 手机端，需要原生构建环境）
vp run dev
```

也可以按需单独启动：

```bash
vp run @aglaea/server#dev
vp run @aglaea/website#dev
vp run @aglaea/web#dev
vp run @aglaea/extension#dev

# Android 手机端：先检查原生构建环境，再连接设备开发
vp run doctor:mobile
vp run dev:mobile
```

默认地址：

| 服务         | 地址                                                               |
| ------------ | ------------------------------------------------------------------ |
| 服务端       | `http://localhost:8787`                                            |
| 健康检查     | `http://localhost:8787/health`                                     |
| WebSocket    | `ws://localhost:8787/ws`                                           |
| OpenAPI 文档 | `http://localhost:8787/openapi`                                    |
| 官网         | `http://localhost:5174`                                            |
| 网页大厅     | `http://localhost:5173`                                            |
| 手机遥控     | `http://localhost:5173/remote.html?room=<房间号>&token=<遥控令牌>` |
| 插件开发产物 | `apps/extension/.output/chrome-mv3`                                |

## 使用流程

1. 打开网页大厅，**创建房间**并记下六位房间号（也可以直接输入房间号查询）。
2. 打开插件弹窗，填入服务端地址与显示名称；需要主持时**创建房间**，需要在别人的房间时输入房间号**加入**。
3. 在弹窗的**播放页面**列表中选择 B 站 `/video/…` 或 `/bangumi/play/…` 标签页，选中即绑定，当前正在看的页面会以「当前页」标记。刷新后保留绑定，只有此标签页参与同步和遥控。成员加入房间后会自动打开并绑定房主视频；房主尚未上传视频时会等待视频信息到达再打开，也可点击**打开视频**手动打开。
4. 房主或成员点击**手机遥控**直接复制链接，在手机上打开即可遥控绑定的播放器，链接在房间存续期间有效。

手机直接观看时，安装 Android 应用并填写手机可访问的服务端地址、昵称和房间码，应用会打开房主视频并跟随播放。手机遥控页仍通过遥控链接控制其他设备；详细流程见 [手机端文档](./apps/mobile/README.md#使用流程)。

## 协议

REST 负责房间生命周期与遥控令牌，WebSocket 负责播放状态与控制事件。

| 方法   | 路径                           | 说明                                     |
| ------ | ------------------------------ | ---------------------------------------- |
| `POST` | `/api/rooms`                   | 创建房间，返回房间号、房主令牌与快照     |
| `GET`  | `/api/rooms/:code`             | 查询房间快照                             |
| `POST` | `/api/rooms/:code/controllers` | 为房主或成员签发绑定其播放器的遥控链接   |
| `POST` | `/api/rooms/:code/leave`       | 使用本次连接令牌退出并广播最新成员列表   |
| `GET`  | `/health`                      | 健康检查，返回协议版本、房间数与运行时长 |
| `WS`   | `/ws`                          | 房间 WebSocket                           |

WebSocket 消息（客户端 → 服务端）：`hello`、`sync`、`control`、`ping`、`leave`。

WebSocket 消息（服务端 → 客户端）：`hello`、`snapshot`、`sync`、`control`、`member-joined`、`member-left`、`pong`、`error`。

`hello` 返回本次连接专属的 `connectionToken`。关闭页面时向 `POST /api/rooms/:code/leave` 提交该令牌，服务端只退出对应连接；刷新前旧页面的请求不会移除重连后的成员。心跳超时与主动退出都会广播 `member-left` 和最新房间快照。

## 验证

```bash
vp check        # 格式化 + lint + 类型检查
vp run typecheck # TypeScript 6 + Vue 模板类型检查
vp run -r test  # 工作区单元测试
vp run build    # 按依赖顺序构建全部包和应用
```

`packages/shared` 覆盖同步计算与房间号工具，`apps/server` 覆盖房间生命周期、令牌校验与角色权限，`apps/mobile` 覆盖房间连接和网页播放器跟随行为。

完整构建使用 `vp run build`（根目录的构建脚本）。它会先构建共享包，再构建依赖它的应用，产物如下：

| 项目             | 产物目录                            |
| ---------------- | ----------------------------------- |
| 共享包           | `packages/shared/dist`              |
| 浏览器插件       | `apps/extension/.output/chrome-mv3` |
| 同步服务端       | `apps/server/dist`                  |
| 网页大厅与遥控端 | `apps/web/dist`                     |
| 官网             | `apps/website/dist`                 |

Android APK 单独构建，不包含在上述 Web 构建中：

```powershell
vp run build:mobile --clean
```

产物位于 `apps/mobile/platforms/android/app/build/outputs/apk/debug/app-debug.apk`，仅包含 `arm64-v8a`，最低支持 Android 8.0。SDK、图标资源和真机验证说明见 [手机端文档](./apps/mobile/README.md#开发)。

## 部署

### 官网部署到 Vercel

在 Vercel 导入仓库，将 **Root Directory** 设为 `apps/website`，并开启 **Include source files outside of the Root Directory in the Build Step**，让构建可以读取 `packages/ui` 与根目录的 workspace 配置。

官网的 `vercel.json` 只安装官网与 `packages/ui` 的依赖，避免触发浏览器扩展的 `postinstall`；同时配置了构建命令、`dist` 输出目录和 SPA 路由回退，`/design` 可以直接访问和刷新，无需额外环境变量。

### Docker 部署同步服务与网页

```bash
cp .env.example .env
# 编辑 .env，设置端口及对外地址
docker compose up -d --build
```

PowerShell 中可用 `Copy-Item .env.example .env` 创建配置文件。

单容器会同时提供 API、WebSocket 与静态网页，默认监听 `8787`。Compose 会读取根目录 `.env`，用于端口映射和容器运行时配置；未创建该文件时使用默认值。`.env` 已排除在 Git 和 Docker 构建上下文之外，修改后执行 `docker compose up -d` 使配置生效，无需重新构建镜像。

| 变量                 | 默认值                   | 用途                                 |
| -------------------- | ------------------------ | ------------------------------------ |
| `PORT`               | `8787`                   | 容器内监听端口                       |
| `AGLAEA_PORT`        | `8787`                   | Compose 映射到宿主机的端口           |
| `AGLAEA_PUBLIC_URL`  | `http://localhost:8787`  | 启动日志中展示的对外地址             |
| `AGLAEA_WEB_URL`     | `http://localhost:8787`  | 生成遥控链接时使用的前端地址         |
| `AGLAEA_STATIC_ROOT` | `/app/website`（Docker） | 设置后由服务端托管该目录下的静态文件 |
| `HOST`               | `0.0.0.0`                | 服务端监听地址                       |

需要独立部署前端时，让构建产物走 Nginx，并把 `/api` 与 `/ws` 反向代理到同一服务端即可。

## 设计

配色取色自参考角色插画：中性炭黑承担背景，金色承载主操作，玉青表示在线与同步状态。

| Token    | 值        | 用途             |
| -------- | --------- | ---------------- |
| Ink      | `#0c0c0c` | 页面背景         |
| Ink Soft | `#171717` | 面板与输入框     |
| Gold     | `#d8b46a` | 主操作、房主标识 |
| Jade     | `#69cdad` | 在线、已同步状态 |
| Ember    | `#e07a5f` | 错误与危险操作   |
| Paper    | `#f3f0e8` | 正文文本         |

完整规格位于官网的 `/design` 子路由，使用 Tailwind CSS 和 `@aglaea/ui` 组件展示配色、字体、间距与组件状态，随官网一起构建部署。开发时访问 `http://localhost:5174/design`。

官网使用 history 路由。部署到 Nginx 时配置 `try_files $uri $uri/ /index.html;`，保证 `/design` 的直接访问和刷新返回应用入口。

品牌仅使用睁眼、无身体的透明头部图：脸从左下探出，左下全部为脸，金发位于上方与右侧。
源图位于 `apps/web/public/brand/aglaea-head.png`；16、32、48、128px PNG 分别放在
`apps/web/public/icons/` 与 `apps/extension/public/icons/`，网页 favicon、品牌标识和 WXT
manifest / action 图标统一引用 `aglaea-head-<尺寸>.png`。

## 当前进度与路线图

目前已经能做到：

- [x] 房间的创建、加入与退出
- [x] 播放状态上报（`play` / `pause` / `seek` / `ratechange` / `episode` 事件 + 周期采样）
- [x] 心跳与服务器时钟偏移校准，超容差才跳转
- [x] 房主 / 成员 / 遥控三档角色与令牌校验
- [x] 手机遥控页与房间遥控令牌
- [x] 通过播放器跳转事件同步房主进度

接下来想做的事：

- [ ] 房间持久化或外部存储，避免重启丢房间
- [ ] 抽出播放器适配层，降低对 B 站 DOM 选择器的直接依赖
- [ ] 多标签页 / 多视频页时的房主端选择策略
- [ ] 端到端测试与自动化发布流程

## 技术栈

| 层     | 技术                                               |
| ------ | -------------------------------------------------- |
| 工具链 | Vite+（`vp`），Bun 1.4.3，Node ≥ 22.18             |
| 插件   | WXT 0.21 + Vue 3.6 RC（Vapor）+ Tailwind CSS v4    |
| 网页   | Vue 3.6 RC（Vapor）+ Tailwind CSS v4（官网与大厅） |
| 服务端 | Bun + Elysia + WebSocket，OpenAPI / TypeScript     |
| 共享层 | Zod 协议定义、同步与令牌计算                       |

## 鸣谢

- [WXT](https://wxt.dev)、[Elysia](https://elysiajs.com)、[Vite+](https://viteplus.dev)：插件、服务端与统一工具链。
- 配色与角色气质取自参考插画，本项目为非官方的同人向工具。

## 许可证

本项目采用 [MIT License](./LICENSE)。
