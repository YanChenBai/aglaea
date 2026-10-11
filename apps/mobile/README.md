# Aglaea Android 试验端

NativeScript Vue 原生房间界面，WebView 打开 B 站页面，通过注入脚本跟随电脑房主。项目组织参考 Robin，TypeScript 启动脚本由 Bun 执行，NativeScript CLI 和 Vite 子进程使用 Node。

`nativescript.vite.config.ts` 专用于 NativeScript 原生构建；`vite.config.ts` 用于 Vite+ 检查与测试。CLI 启动脚本位于应用自己的 `scripts/nativescript.ts`，无需根目录构建环境开关。

```powershell
vp install
vp run doctor:mobile
vp run dev:mobile
vp run build:mobile
```

`build:mobile` 生成调试 APK：`platforms/android/app/build/outputs/apk/debug/app-debug.apk`。Android 构建独立于根目录 `build`，避免普通 Web 构建依赖 Android SDK。手机端仍参与根目录类型检查和测试。

启动图标原图保存在 `assets/icon.png`，Android 资源包含五档分辨率和白底自适应图标。替换原图后，在手机应用目录运行 `powershell -ExecutionPolicy Bypass -File scripts/generate-android-icons.ps1` 重新生成，再构建 APK。

电脑启动同步服务和插件，创建房间并打开视频；手机填写服务器地址、昵称和房间码加入。真机需要填写同一局域网内电脑的 IP 或部署后的 HTTPS 地址；初始 `10.0.2.2` 地址仅适用于 Android 模拟器。

当前支持作为成员加入、播放/暂停/进度/倍速跟随、房主换视频、重连、回到前台重新连接和手动同步。原生层处理房间和时钟校准，WebView 只接收播放指令，不持有房间凭证。导航限制在 B 站 HTTPS 域内，阻止外部 App 唤起。WebView 登录状态由其自身 Cookie 存储维护。

WebView 使用 Windows 桌面 UA，保留设备实际 Chromium 版本；房主提供移动页链接时会转为桌面页。页面默认缩放为 50%，工具栏可调节 50%–200%，也可双指缩放。原生界面沿用 Web/插件的墨黑、暖金、纸白和 8px 圆角。房间码会记住，漏填时在表单中显示错误。

主界面顶部显示房间与播放器状态，状态点用灰色表示未加入、金色表示连接中或等待播放器、绿色表示就绪、红色表示断开。普通模式下播放器四周留白 12dp，视频区域使用 12dp 圆角裁剪。底部加入/退出房间使用图标加文字，其余操作使用无边框图标；加入房间打开表单模态框，成员入口打开实时成员列表，日志入口打开详细日志模态框，保留最近 200 条带时间的记录。

点击全屏会切换 B 站播放器的网页全屏，隐藏房间界面、状态栏和导航栏，让 WebView 铺满屏幕并延伸至刘海区域。右上角状态胶囊沿用插件的连接状态、房间码和同步图标，2.5 秒后自动隐藏，触碰画面会重新显示。Android 返回键可退出全屏；页面跳转会恢复普通界面。

成员加入/离开、连接中断、房间错误和播放受限通过浮层消息显示，全屏期间也可见。同步图标可请求同步房间进度；消息在 4.2 秒后消失，最多同时显示三条。

加入房间后启动媒体播放前台服务；播放期间申请音频焦点和 CPU 唤醒锁，并保持 WebView 的网页可见状态。失去音频焦点时暂停本机播放，临时焦点恢复后继续跟随房主；永久失去焦点后可点胶囊里的同步图标重新申请。退出房间会停止服务、释放焦点和唤醒锁。后台与锁屏表现仍需真机验证，系统强制结束应用后不会继续播放。

Android 构建只保留 `arm64-v8a`，生成的 APK 用于 ARM64 真机，不支持本机 x86 模拟器安装。

此版本为了局域网调试允许 HTTP，正式发布前应限制明文流量。B 站桌面页的登录、画质、网页全屏以及后台持续播放仍需设备验证；不包含手机房主或独立的视频地址解析。

此前多架构版本已验证 Android API 30 模拟器启动、B 站移动页加载、真实服务端 WebSocket 加入、播放器桥接与房主暂停指令。当前桌面 UA / ARM64 版本需要真机确认视觉效果和播放表现。播放、暂停、跳转、倍速及替换播放器的核心行为有自动化测试；完整跨端连续播放、登录和全屏仍需进一步实测。

根目录 Vite 使用 Vite+ catalog，手机端使用标准 Vite。Bun 不支持 Robin 使用的 pnpm 命名 catalog 隔离方式，因此移除了全局 Vite override，保留各包的显式 Vite 依赖。NativeScript CLI 的 Bun 适配器仍调用 `npm view` 查询版本，启动脚本仅在该 CLI 子进程环境设置 `npm_config_force`，以兼容根目录 Bun `devEngines`。
