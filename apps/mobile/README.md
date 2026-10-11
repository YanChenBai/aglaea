<p align="center">
  <img width="200" src="../../apps/web/public/brand/aglaea-head.png" alt="Aglaea" />
</p>

<h1 align="center">Aglaea Android</h1>

<p align="center">把手机加入同一个房间，让 B 站播放器跟随房主的节拍。</p>

<p align="center">
  <a href="https://nativescript.org"><img src="https://img.shields.io/badge/NativeScript-Vue-65adf1?labelColor=0a1418" alt="NativeScript Vue"></a>
  <img src="https://img.shields.io/badge/Android-ARM64-3ddc84?logo=android&logoColor=white&labelColor=0a1418" alt="Android ARM64">
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white&labelColor=0a1418" alt="TypeScript"></a>
</p>

> [!NOTE]
> 这是 Android 试验端，当前仅支持作为成员跟随房主。构建产物为 ARM64 调试 APK，最低支持 Android 8.0；后台与锁屏持续播放仍需进一步真机验证。

## 这是什么

Aglaea Android 使用 NativeScript Vue 构建原生房间界面，在 WebView 中打开 B 站桌面页面。电脑端插件负责上报房主进度，手机按房间快照校准播放、暂停、进度与倍速。

手机应用参与视频播放；仓库里的 [手机遥控页](../web/remote.html) 则通过遥控令牌操作其他设备上的播放器。当前应用不提供手机房主功能，也不独立解析视频地址。

## 功能特性

- **房间同步**：通过六位房间码加入，跟随房主播放、暂停、拖动、倍速和视频切换；支持时钟校准、自动重连与手动同步。
- **桌面播放页**：使用 Windows 桌面 UA，保留设备实际 Chromium 版本；移动页链接会转为桌面页。默认缩放 50%，工具栏支持 50%–200% 调节，也可双指缩放。
- **沉浸式全屏**：切换 B 站网页全屏，同时隐藏原生工具栏、系统状态栏与导航栏，WebView 延伸至刘海区域。Android 返回键退出全屏，页面跳转恢复普通界面。
- **原生房间界面**：沿用 Web/插件的墨黑、暖金与纸白配色，播放区域四周留白并裁剪圆角。加入表单、实时成员列表与详细日志使用模态框。
- **状态与提示**：顶部显示房间和播放器状态，连接、成员变动和播放受限通过浮层提示。播放器状态胶囊提供同步入口，自动隐藏后可触碰画面唤回。
- **系统媒体控制**：通知栏与锁屏发布视频标题、应用图标和播放状态，支持媒体卡片与耳机播放/暂停键。暂停只影响本机，继续播放会重新跟随房主进度。

## 使用流程

1. 启动同步服务，在电脑浏览器插件中创建房间并打开 B 站视频。
2. 在手机上点击 **加入房间**，填写服务端地址、昵称和六位房间码。
3. 加入后，应用打开房主视频并跟随播放。可通过底部图标调整缩放、进入全屏、查看成员或打开日志。
4. 需要重新对齐进度时，点击播放器状态胶囊里的同步图标；结束观看时点击 **退出房间**。

真机应填写手机可访问的服务端地址，例如同一局域网内电脑的 `http://192.168.1.10:8787`，或部署后的 HTTPS 地址。初始地址 `http://10.0.2.2:8787` 是 Android 模拟器访问宿主机的地址，不能直接用于真机；当前 ARM64 APK 也不支持 x86 模拟器安装。

状态点用灰色表示未加入、金色表示连接中或等待播放器、绿色表示就绪、红色表示断开。主界面只展示基础状态；日志模态框保留最近 200 条带时间的记录。

## 架构

```text
电脑房主插件 ── WebSocket ── 同步服务
                               │ 房间快照与成员事件
                               ▼
                     NativeScript 原生房间层
                               │ 播放指令与状态回传
                               ▼
                        WebView / B 站页面
                               │ 本机播放许可
                               ▼
               Android 前台服务 / MediaSession / 音频焦点
```

原生层负责连接、房间凭证与时钟校准；注入 WebView 的脚本只负责播放器操作和状态回传。导航限制在 B 站 HTTPS 域内，登录状态由 WebView 自身的 Cookie 存储维护。

Android 前台服务在播放期间申请音频焦点和 CPU 唤醒锁，并保持 WebView 的网页可见状态。失去焦点时暂停本机，临时焦点恢复后继续跟随；永久失去焦点后可通过同步入口重新申请。退出房间释放媒体会话、焦点与唤醒锁，系统强制结束应用后不会继续播放。

```text
apps/mobile/
  src/components/             原生界面与模态框
  src/room/                   房间连接、表单与 WebSocket
  src/player/                 网页播放器桥接、导航与全屏
  App_Resources/Android/      Android 配置、原生服务与图标
  scripts/                    Bun 启动脚本与图标生成脚本
  tests/                      同步与播放器行为测试
  nativescript.vite.config.ts NativeScript 原生构建
  vite.config.ts              Vite+ 检查与测试
```

## 开发

在仓库根目录运行以下命令。环境需要 Bun、Node 和 Android 构建工具链，可先通过 doctor 检查 SDK 与 Java 配置。

```powershell
vp install
vp run doctor:mobile
vp run dev:mobile
```

构建 APK：

```powershell
vp run build:mobile

# 需要清理构建缓存时
vp run build:mobile --clean
```

| 项目         | 配置 / 产物                                                               |
| ------------ | ------------------------------------------------------------------------- |
| 应用 ID      | `dev.aglaea.mobile`                                                       |
| Android 版本 | 最低 API 26，目标 API 36                                                  |
| CPU 架构     | `arm64-v8a`                                                               |
| 调试 APK     | `apps/mobile/platforms/android/app/build/outputs/apk/debug/app-debug.apk` |

Android 构建独立于根目录 `build`，普通 Web 构建无需 Android SDK。手机端仍参与根目录类型检查与测试。

TypeScript 启动脚本由 Bun 执行，NativeScript CLI 和 Vite 子进程使用 Node。根目录 Vite 使用 Vite+ catalog，手机端使用标准 Vite；两者通过各包显式依赖区分。启动脚本仅为 NativeScript CLI 子进程设置 `npm_config_force`，兼容其 `npm view` 查询与根目录 Bun `devEngines`。

### 图标资源

启动图标原图位于 `assets/icon.png`，生成五档 Android 分辨率和白底自适应图标。替换原图后，在仓库根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File apps/mobile/scripts/generate-android-icons.ps1
vp run build:mobile --clean
```

通知栏小图标使用 `App_Resources/Android/src/main/res/drawable/ic_notification.xml` 的单色 A；媒体卡片图片使用应用头像。

## 验证

```powershell
vp check
vp run @aglaea/mobile#typecheck
vp run @aglaea/mobile#test
vp run build:mobile --clean
```

自动化测试覆盖房间连接与重连、成员提示、播放/暂停、跳转、倍速、播放器替换以及本机暂停状态。Android 构建通过后，还需在真机确认系统媒体卡片、全屏和后台行为。

当前真机反馈已确认桌面页面、原生界面与媒体卡片显示。登录、画质、完整跨端连续播放、锁屏持续播放和音频焦点恢复仍需进一步实测，构建成功不代表这些行为均已验证。

> [!NOTE]
> 当前版本允许 HTTP 以便局域网调试。正式发布前应收紧明文流量配置；B 站播放器的 DOM 与页面接口也可能随其前端版本变化。
