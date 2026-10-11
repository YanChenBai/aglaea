# @aglaea/ui

Aglaea 的设计 token 与 Vue Vapor 基础组件，设计规范由官网 [`/design`](../../apps/website/src/pages/DesignPage.vue) 展示。包直接导出 TypeScript、Vue SFC 和 CSS 源码，由消费应用编译，没有 `build` 脚本或 `dist` 目录。

## 引入

在应用的 `package.json` 中添加 `"@aglaea/ui": "workspace:*"`，然后运行 `vp install`。应用使用 Vue 3.6 RC，Vue 编译插件需启用 `features: { vapor: true }`。

```vue
<script setup vapor lang="ts">
import { ref } from 'vue';
import { UiBadge, UiButton, UiInput, UiPanel } from '@aglaea/ui';

const code = ref('');
</script>

<template>
  <UiPanel as="section" class="room-panel">
    <UiBadge tone="success">在线</UiBadge>
    <UiInput v-model="code" aria-label="房间号" maxlength="6" />
    <UiButton variant="primary">加入房间</UiButton>
  </UiPanel>
</template>
```

组件样式在应用入口显式加载一次：

```ts
import '@aglaea/ui/styles.css';
```

`styles.css` 包含设计 token 与组件样式，不重置页面。需要 Aglaea 的页面背景和基础字体时，再加载 `@aglaea/ui/base.css`。面板内边距、宽度和组件间距由应用布局决定。

## Tailwind

使用现有的 `ag:` 前缀时，在应用 CSS 中加载映射：

```css
@import 'tailwindcss' prefix(ag);
@import '@aglaea/ui/tailwind.css';
@import '@aglaea/ui/styles.css';
@import '@aglaea/ui/base.css';
```

`tailwind.css` 将颜色和字体映射到共享 CSS 变量，使 `ag:text-ag-gold`、`ag:font-mono` 等工具类保持可用。组件自身使用普通 CSS，不依赖 Tailwind 扫描包内源码。

## 组件

| 组件           | 属性                                                 | 用途                           |
| -------------- | ---------------------------------------------------- | ------------------------------ |
| `UiButton`     | `variant`、`size`、`type`、`disabled`                | 原生按钮；默认 `type="button"` |
| `UiButtonLink` | 必填 `href`、`variant`、`size`                       | 保留原生链接导航和键盘行为     |
| `UiInput`      | 必填字符串 `v-model`、`type`、`disabled`             | 单行输入；原生属性和事件透传   |
| `UiPanel`      | `as`: `div` / `section` / `article` / `li`           | 面板表面；默认 `div`           |
| `UiBadge`      | `tone`: `warning` / `success` / `danger` / `neutral` | 状态样式；文字通过默认插槽提供 |

按钮 `variant` 支持 `primary`（金色）、`success`（玉青）、`ghost`、`danger`、`solid`（实心金色）。`size="md"` 高度为 40px，`lg` 为 44px。输入框高度为 44px，基础圆角为 8px。

所有组件透传 `class`、`style`、ARIA 属性和原生事件。房间、连接状态和播放命令由应用组件管理，UI 包不依赖 `@aglaea/shared` 或应用代码。

## Token

`@aglaea/ui/tokens.css` 可以单独引入，提供 `--ag-ui-*` 颜色、字体、圆角、间距和动效变量。`styles.css`、`base.css` 与 `tailwind.css` 已自动包含它。修改变量即可调整对应组件与工具类：

```css
:root {
  --ag-ui-gold: #d8b46a;
  --ag-ui-radius: 8px;
}
```

`@aglaea/ui/tokens` 导出 `useDesignTokens()` 和 `DesignToken`，用于读取设计规格的展示数据；运行时样式以 CSS token 为准。

## 检查

```bash
vp run @aglaea/ui#check
```

使用 TypeScript 6 和 `vue-tsc` 检查 Vue 模板，不生成发布产物。
