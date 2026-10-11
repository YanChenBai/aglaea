<p align="center">
  <img width="200" src="../../apps/web/public/brand/aglaea-head.png" alt="Aglaea" />
</p>

<h1 align="center">Aglaea Extension</h1>

<p align="center">连接 B 站播放器，和朋友同步播放、暂停、进度与切集。</p>

<p align="center">
  <a href="https://wxt.dev"><img src="https://img.shields.io/badge/WXT-0.21-67d55e?labelColor=0a1418" alt="WXT"></a>
  <a href="https://vuejs.org"><img src="https://img.shields.io/badge/Vue-3.6_RC_Vapor-42b883?logo=vuedotjs&logoColor=white&labelColor=0a1418" alt="Vue"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white&labelColor=0a1418" alt="TypeScript"></a>
</p>

基于 WXT + Vue Vapor 的 B 站同步观影插件。在视频页读取播放器状态，通过 Aglaea 服务同步播放、暂停、进度、倍速与切集，并提供手机遥控链接。

## 使用

1. 在浏览器扩展管理页开启开发者模式，加载 `apps/extension/.output/chrome-mv3`。
2. 打开插件弹窗，填写服务端地址与昵称，创建房间或输入六位房间码加入。
3. 房主在播放页面列表中选择 B 站视频或番剧标签页；成员加入后自动打开并绑定房主视频。
4. 点击「手机遥控」复制链接，在手机浏览器中打开。

只有绑定的播放标签页参与同步。刷新保留绑定，关闭绑定标签页会退出房间。服务端地址保存在 `browser.storage.local` 中。

## 开发

在仓库根目录运行，服务端在另一终端启动：

```bash
vp install
vp run @aglaea/shared#build
vp run @aglaea/client#build
vp run @aglaea/server#dev
```

```bash
vp run @aglaea/extension#dev
```

WXT 配置与权限声明见 [`wxt.config.ts`](./wxt.config.ts)。插件依赖 B 站页面 DOM 与播放器对象，站点更新后可能需要调整适配。

## 结构

| 入口                        | 用途                           |
| --------------------------- | ------------------------------ |
| `entrypoints/background.ts` | 房间连接、配置与播放标签页管理 |
| `entrypoints/content.ts`    | B 站播放器采样与控制           |
| `entrypoints/popup/`        | 房间、成员与播放器选择界面     |
| `public/icons/`             | 浏览器扩展图标                 |

## 验证与构建

```bash
vp run @aglaea/extension#typecheck
vp run @aglaea/extension#build
vp run @aglaea/extension#zip
```

默认构建产物为 `.output/chrome-mv3`，`zip` 生成分发压缩包。房间服务与部署步骤见 [项目 README](../../README.md)。
