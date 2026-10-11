<p align="center">
  <img width="200" src="./apps/web/public/brand/aglaea-head.png" alt="Aglaea" />
</p>

<h1 align="center">鸣谢与第三方软件声明</h1>

<p align="center">Aglaea 建立在开源社区的工作之上，感谢每一位作者、维护者与贡献者。</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-d8b46a?labelColor=0a1418" alt="MIT" />
  <img src="https://img.shields.io/badge/License-Apache--2.0-69cdad?labelColor=0a1418" alt="Apache-2.0" />
  <img src="https://img.shields.io/badge/License-ISC-f3f0e8?labelColor=0a1418" alt="ISC" />
</p>

<p align="center">
  <a href="#界面与交互">界面与交互</a> ·
  <a href="#服务与协议">服务与协议</a> ·
  <a href="#浏览器与原生端">浏览器与原生端</a> ·
  <a href="#开发工具链">开发工具链</a> ·
  <a href="#版权与许可">版权与许可</a>
</p>

## 界面与交互

| 项目与来源                                                     | 使用的包                           | 在 Aglaea 中的用途                     | 许可证                           |
| -------------------------------------------------------------- | ---------------------------------- | -------------------------------------- | -------------------------------- |
| [Vue](https://github.com/vuejs/core)                           | `vue`、`@vue/compiler-sfc`         | 响应式界面、Vapor 组件与单文件组件编译 | MIT                              |
| [Vue Router](https://github.com/vuejs/router)                  | `vue-router`                       | 官网页面与设计规范路由                 | MIT                              |
| [VueUse](https://github.com/vueuse/vueuse)                     | `@vueuse/core`                     | 官网组合式工具函数                     | MIT                              |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)    | `tailwindcss`、`@tailwindcss/vite` | 页面样式与 Vite 编译集成               | MIT                              |
| [Motion for Vue](https://github.com/motiondivision/motion-vue) | `motion-v`                         | 官网交互动效                           | MIT                              |
| [Lucide](https://github.com/lucide-icons/lucide)               | `lucide-vue-next`                  | 界面 SVG 图标                          | ISC；部分图标源自 Feather（MIT） |

Lucide 保留了源自 [Feather](https://github.com/feathericons/feather) 的图标，相关版权归 Cole Bemis；其余部分归 Lucide 贡献者。具体范围见 [Lucide 许可声明](https://github.com/lucide-icons/lucide/blob/main/LICENSE)。

## 服务与协议

| 项目与来源                                                   | 使用的包            | 在 Aglaea 中的用途             | 许可证 |
| ------------------------------------------------------------ | ------------------- | ------------------------------ | ------ |
| [Elysia](https://github.com/elysiajs/elysia)                 | `elysia`            | HTTP API 与 WebSocket 房间服务 | MIT    |
| [Eden](https://github.com/elysiajs/eden)                     | `@elysiajs/eden`    | 从服务端类型推导客户端请求     | MIT    |
| [Elysia CORS](https://github.com/elysiajs/elysia-cors)       | `@elysiajs/cors`    | 跨域请求支持                   | MIT    |
| [Elysia OpenAPI](https://github.com/elysiajs/elysia-openapi) | `@elysiajs/openapi` | 接口规格与文档                 | MIT    |
| [Elysia Static](https://github.com/elysiajs/elysia-static)   | `@elysiajs/static`  | 部署时托管静态网页             | MIT    |
| [Zod](https://github.com/colinhacks/zod)                     | `zod`               | 共享协议与消息校验             | MIT    |
| [TypeBox](https://github.com/sinclairzx81/sinclair-typebox)  | `@sinclair/typebox` | 服务端接口类型与 Schema        | MIT    |

## 浏览器与原生端

| 项目与来源                                                                                | 使用的包                                    | 在 Aglaea 中的用途                | 许可证     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------- | ---------- |
| [WXT](https://github.com/wxt-dev/wxt)                                                     | `wxt`、`@wxt-dev/module-vue`                | 浏览器扩展构建、入口与 Vue 集成   | MIT        |
| [NativeScript Core](https://github.com/NativeScript/NativeScript)                         | `@nativescript/core`、`@nativescript/types` | Android 原生界面、平台 API 与类型 | Apache-2.0 |
| [NativeScript Android](https://github.com/NativeScript/android)                           | `@nativescript/android`                     | Android 原生运行时                | Apache-2.0 |
| [NativeScript CLI](https://github.com/NativeScript/nativescript-cli)                      | `nativescript`                              | 原生环境诊断、设备调试与 APK 构建 | Apache-2.0 |
| [NativeScript Vue](https://github.com/nativescript-vue/nativescript-vue)                  | `nativescript-vue`                          | Vue 与原生界面集成                | MIT        |
| [NativeScript Vite](https://github.com/NativeScript/NativeScript/tree/main/packages/vite) | `@nativescript/vite`                        | 原生端 Vite 构建集成              | MIT        |
| [NativeScript Community WebView](https://github.com/nativescript-community/ui-webview)    | `@nativescript-community/ui-webview`        | B 站页面承载与播放器桥接          | Apache-2.0 |
| [Valor NativeScript Plugins](https://github.com/valor-software/nativescript-plugins)      | `@valor/nativescript-websockets`            | 原生端 WebSocket 连接             | MIT        |

## 开发工具链

| 项目与来源                                                               | 使用的包 / 工具                                | 在 Aglaea 中的用途                          | 许可证                  |
| ------------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------- | ----------------------- |
| [Bun](https://github.com/oven-sh/bun)                                    | Bun                                            | 服务端运行、依赖安装与脚本执行              | MIT，内含组件见上游声明 |
| [Node.js](https://github.com/nodejs/node)                                | Node.js                                        | Web 与原生端开发工具运行                    | MIT，内含组件见上游声明 |
| [Vite+](https://github.com/voidzero-dev/vite-plus)                       | `vite-plus`、`@voidzero-dev/vite-plus-core`    | 统一开发、构建、检查与任务调度              | MIT                     |
| [Vite](https://github.com/vitejs/vite)                                   | `vite`                                         | 开发服务器与应用构建；Web 端通过 Vite+ 使用 | MIT                     |
| [Vite Vue Plugins](https://github.com/vitejs/vite-plugin-vue)            | `@vitejs/plugin-vue`、`@vitejs/plugin-vue-jsx` | Vue 单文件组件与 JSX 编译                   | MIT                     |
| [TypeScript](https://github.com/microsoft/TypeScript)                    | `typescript`                                   | 类型检查与类型声明生成                      | Apache-2.0              |
| [Vue Language Tools](https://github.com/vuejs/language-tools)            | `vue-tsc`                                      | Vue 模板与组件类型检查                      | MIT                     |
| [ESLint Stylistic](https://github.com/eslint-stylistic/eslint-stylistic) | `@stylistic/eslint-plugin`                     | 代码样式规则                                | MIT                     |
| [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped)    | `@types/bun`、`@types/node`、`@types/chrome`   | 运行时与浏览器 API 类型声明                 | MIT                     |

Vite+ 同时集成以下关键工具，具体版本可通过 `vp toolchain` 查看：

| 项目与来源                                       | 用途                                     | 许可证 |
| ------------------------------------------------ | ---------------------------------------- | ------ |
| [Rolldown](https://github.com/rolldown/rolldown) | 模块打包                                 | MIT    |
| [tsdown](https://github.com/rolldown/tsdown)     | 共享包与客户端库构建                     | MIT    |
| [Vitest](https://github.com/vitest-dev/vitest)   | 单元测试                                 | MIT    |
| [Oxc](https://github.com/oxc-project/oxc)        | 编译基础设施、Oxlint 检查与 Oxfmt 格式化 | MIT    |

## 图标与品牌素材

官网技术栈插图部分使用 [Devicon](https://github.com/devicons/devicon) 的 MIT 许可 SVG，其余使用对应项目提供的官方图标。来源与固定版本记录见 [`technologies/README.txt`](./apps/website/public/technologies/README.txt)。

各项目名称、商标与 Logo 归各自权利人所有，在此用于识别所使用的技术。Aglaea 为非官方同人向工具，项目名称与角色形象所涉及的原作权益归相应权利人所有。

## 版权与许可

Aglaea 自身代码采用 [MIT License](./LICENSE)，版权声明为 `Copyright (c) 2026 Aglaea contributors`。第三方代码、图标及其他素材的版权归各自作者与贡献者所有，分别适用其原有许可证。

本文件列出根目录及各 workspace 的外部直接依赖、关键集成工具和已使用的技术图标来源。许可证信息依据 2026 年 10 月 11 日仓库安装包中的 `package.json`、`LICENSE` 及上游声明核对；其中 NativeScript 各包分别记录，未按框架名称合并许可证。

完整许可条款与版权通知以实际使用版本附带的 `LICENSE`、`NOTICE` 等文件为准。分发包含第三方代码的产物时，应保留相应许可与版权通知；本文件提供来源索引，完整传递依赖声明以所分发组件的许可文件为准。

运行时内含组件另见 [Bun 许可声明](https://bun.com/docs/project/license) 与 [Node.js 许可声明](https://github.com/nodejs/node/blob/main/LICENSE)。NativeScript Android 的许可见 [上游 LICENSE](https://github.com/NativeScript/android/blob/main/LICENSE)。

---

<p align="center">感谢开源社区，让一起观看这件小事成为可能。</p>
