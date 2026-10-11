<p align="center">
  <img width="200" src="../../apps/web/public/brand/aglaea-head.png" alt="Aglaea" />
</p>

<h1 align="center">Aglaea Website</h1>

<p align="center">了解 Aglaea，查看使用流程与设计规范。</p>

<p align="center">
  <a href="https://vuejs.org"><img src="https://img.shields.io/badge/Vue-3.6_RC_Vapor-42b883?logo=vuedotjs&logoColor=white&labelColor=0a1418" alt="Vue"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white&labelColor=0a1418" alt="TypeScript"></a>
  <a href="https://viteplus.dev"><img src="https://img.shields.io/badge/Vite%2B-1.0-d8b46a?labelColor=0a1418" alt="Vite+"></a>
</p>

Aglaea 的官网，介绍同步观影功能、使用流程与自行部署方式，并展示设计规范。使用 Vue Vapor、Tailwind CSS 和 [`@aglaea/ui`](../../packages/ui/README.md)，可独立作为静态站点部署。

## 页面

| 路径      | 内容                           |
| --------- | ------------------------------ |
| `/`       | 项目介绍、功能、使用与部署说明 |
| `/design` | 配色、字体、间距与基础组件状态 |

设计规范通过页面直接查看。共享 token 与组件在 `packages/ui` 中维护，官网负责展示。

## 开发

在仓库根目录运行：

```bash
vp install
vp run @aglaea/website#dev
```

访问 `http://localhost:5174`，设计规范位于 `http://localhost:5174/design`。UI 包直接导出源码，无需先构建共享包或启动同步服务。

## 结构

| 目录 / 文件       | 用途                     |
| ----------------- | ------------------------ |
| `src/pages/`      | 首页与设计规范页         |
| `src/components/` | 首页各章节与公共展示组件 |
| `src/effects/`    | 背景与视觉效果           |
| `src/router.ts`   | 页面路由                 |
| `src/links.ts`    | 项目链接                 |

## 验证与部署

```bash
vp run @aglaea/website#typecheck
vp run @aglaea/website#build
vp run @aglaea/website#preview
```

构建输出到 `dist`。在 Vercel 中设置 Root Directory 为 `apps/website`，并开启 **Include source files outside of the Root Directory in the Build Step**；[`vercel.json`](./vercel.json) 已配置依赖安装、构建与路由回退。

独立部署到 Nginx 时配置 `try_files $uri $uri/ /index.html;`，保证 `/design` 的直接访问和刷新可用。
