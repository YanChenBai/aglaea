<script setup vapor lang="ts">
import { UiBadge, UiButton, UiInput, UiPanel } from '@aglaea/ui';
import { useDesignTokens } from '@aglaea/ui/tokens';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';

import DesignSection from '../components/DesignSection.vue';

const { colors, typography, spacing, motion, principles } = useDesignTokens();
const roomCode = ref('ABCDEF');

const sections = [
  { id: 'logos', label: 'Logo' },
  { id: 'colors', label: '色彩' },
  { id: 'typography', label: '字体' },
  { id: 'spacing', label: '间距' },
  { id: 'motion', label: '动效' },
  { id: 'components', label: '组件' },
  { id: 'illustration', label: '插画使用' },
];

const logoPreviews = [
  {
    title: '深色背景 · 默认标识',
    background: 'ag:bg-ag-ink',
    description: '网页品牌、浏览器标签与插件工具栏统一使用。',
  },
  {
    title: '浅色背景',
    background: 'ag:bg-ag-paper',
    description: '同一透明 PNG，在浅色背景上保留金发轮廓与面部细节。',
  },
  {
    title: '透明边缘',
    background:
      'ag:bg-[repeating-conic-gradient(#d8e6e2_0%_25%,#f3f0e8_0%_50%)] ag:bg-size-[20px_20px]',
    description: '棋盘格仅用于展示透明区域，不包含在素材中。圆角直接保存在图片中。',
  },
];

const typeClasses = [
  'ag:font-serif ag:text-[44px] ag:leading-[1.1]',
  'ag:font-serif ag:text-2xl ag:leading-[1.25]',
  'ag:text-sm ag:leading-[1.6]',
  'ag:text-xs ag:leading-[1.4] ag:tracking-[0.18em]',
  'ag:font-mono ag:text-lg ag:leading-[1.4] ag:tracking-[0.12em]',
];

const members = [
  { name: '房主 · 星见', role: 'owner', color: 'ag:bg-ag-gold' },
  { name: '手机遥控', role: 'controller', color: 'ag:bg-ag-jade' },
  { name: '观众', role: 'member', color: 'ag:bg-ag-muted' },
];

const illustrationRules = [
  { title: 'Do', text: '插画放在页面级区块，与信息流分离。', color: 'ag:text-ag-gold-pale' },
  { title: "Don't", text: '不要在按钮、输入框或状态标签里放角色图。', color: 'ag:text-ag-mist' },
  { title: "Don't", text: '不要让金色装饰覆盖正文或降低可读性。', color: 'ag:text-ag-mist' },
];
</script>

<template>
  <div class="ag:mx-auto ag:max-w-6xl ag:px-6 ag:pt-28 ag:pb-8">
    <div class="ag:flex ag:flex-wrap ag:items-center ag:justify-between ag:gap-4">
      <p class="ag-eyebrow">Design Spec · v0.0.0</p>
      <RouterLink
        to="/"
        class="ag-focus ag:text-sm ag:text-ag-muted ag:underline ag:decoration-ag-gold/40 ag:underline-offset-4 ag:hover:text-ag-gold"
        >返回官网</RouterLink
      >
    </div>

    <section class="ag:grid ag:items-center ag:gap-8 ag:py-12 ag:lg:grid-cols-2">
      <div>
        <p class="ag-eyebrow">Visual Language</p>
        <h1 class="ag-display ag:mt-4 ag:text-[44px] ag:leading-[1.1]">
          阿格莱亚<br />设计元素与规格
        </h1>
        <p class="ag:mt-6 ag:text-sm ag:leading-7 ag:text-ag-mist">
          取色自参考角色的金色缎带、白金服饰与环形青绿水面。界面以中性炭黑承载注意力，以金色标示主操作，以玉青承担在线、同步等运行状态。字号与控件尺寸使用固定规格。
        </p>
        <div class="ag:mt-6 ag:flex ag:flex-wrap ag:gap-2">
          <UiBadge tone="neutral">Charcoal Black</UiBadge>
          <UiBadge tone="neutral">8px Radius</UiBadge>
          <UiBadge tone="neutral">Serif Display</UiBadge>
          <UiBadge tone="neutral">Vapor First</UiBadge>
        </div>
      </div>
      <figure class="ag:mx-auto ag:w-full ag:max-w-md">
        <img
          :src="'/aglaea-illustration.webp'"
          alt="阿格莱雅角色插画：白金服饰与金色缎带环绕青绿色水面"
          width="1000"
          height="1000"
          decoding="async"
          class="ag:aspect-square ag:w-full ag:object-contain ag:mix-blend-screen"
        />
        <figcaption class="ag:mt-3 ag:text-center ag:text-xs ag:text-ag-muted">
          角色插画 · 金色丝线 / 白金服饰 / 青绿水面
        </figcaption>
      </figure>
    </section>

    <nav
      aria-label="设计规范章节"
      class="ag:mb-8 ag:flex ag:flex-wrap ag:gap-x-6 ag:gap-y-3 ag:border-y ag:border-white/10 ag:py-4"
    >
      <a
        v-for="section in sections"
        :key="section.id"
        :href="`#${section.id}`"
        class="ag-focus ag:text-xs ag:text-ag-mist ag:no-underline ag:hover:text-ag-gold"
        >{{ section.label }}</a
      >
    </nav>

    <DesignSection
      id="logos"
      class="ag:border-t-0"
      title="Logo 与图标"
      description="仅保留睁眼的透明底头部标识：脸从左下角探出，左下全部为脸，金色卷发集中在上方与右侧。大圆眼、椭圆腮红与小红点嘴巴沿用参考图的脸部设计，不露出身体。"
    >
      <div class="ag:grid ag:gap-4 ag:md:grid-cols-3">
        <UiPanel v-for="preview in logoPreviews" :key="preview.title" class="ag:p-4">
          <div
            class="ag:mb-4 ag:grid ag:min-h-48 ag:place-items-center ag:rounded-lg"
            :class="preview.background"
          >
            <img
              :src="'/brand/aglaea-head.png'"
              :alt="`${preview.title}上的阿格莱亚头部标识`"
              width="144"
              height="144"
              loading="lazy"
            />
          </div>
          <h3 class="ag-display ag:text-xl">{{ preview.title }}</h3>
          <p class="ag:mt-2 ag:text-xs ag:leading-6 ag:text-ag-muted">{{ preview.description }}</p>
        </UiPanel>
      </div>
      <div
        aria-label="默认图标的实际显示尺寸"
        class="ag:mt-8 ag:flex ag:flex-wrap ag:items-end ag:gap-8"
      >
        <figure
          v-for="size in [16, 32, 48, 128]"
          :key="size"
          class="ag:grid ag:justify-items-center ag:gap-3"
        >
          <img
            :src="`/icons/aglaea-head-${size}.png`"
            :alt="`${size} 像素图标`"
            :width="size"
            :height="size"
            loading="lazy"
          />
          <figcaption class="ag:font-mono ag:text-xs ag:text-ag-muted">{{ size }}px</figcaption>
        </figure>
      </div>
    </DesignSection>

    <DesignSection
      id="colors"
      title="色彩"
      description="背景采用从炭黑到深灰的中性层次。金色用于行动，玉青用于运行状态；色板展示共享 token 的色值、CSS 变量与用途。"
    >
      <div class="ag:grid ag:grid-cols-2 ag:gap-4 ag:md:grid-cols-3 ag:lg:grid-cols-4">
        <UiPanel v-for="color in colors" :key="color.name" as="article" class="ag:overflow-hidden">
          <div
            class="ag:h-20 ag:border-b ag:border-white/10"
            :style="{ backgroundColor: `var(--ag-ui-${color.name})` }"
            aria-hidden="true"
          ></div>
          <div class="ag:p-4">
            <code class="ag:text-sm">{{ color.value }}</code>
            <p class="ag:mt-2 ag:break-all ag:font-mono ag:text-[11px] ag:text-ag-gold">
              --ag-ui-{{ color.name }}
            </p>
            <p class="ag:mt-2 ag:text-xs ag:leading-6 ag:text-ag-muted">{{ color.usage }}</p>
          </div>
        </UiPanel>
      </div>
    </DesignSection>

    <DesignSection
      id="typography"
      title="字体"
      description="衬线体只出现在品牌、首屏标题与页面级标题；正文与控件保持无衬线；房间号与时间使用等宽体。"
    >
      <div class="ag:space-y-2">
        <div
          v-for="(type, index) in typography"
          :key="type.name"
          class="ag:grid ag:items-center ag:gap-3 ag:border-b ag:border-white/10 ag:py-5 ag:md:grid-cols-[100px_1fr_240px]"
        >
          <p class="ag:font-mono ag:text-xs ag:text-ag-gold">{{ type.name }}</p>
          <p :class="typeClasses[index]">{{ type.sample }}</p>
          <p class="ag:text-xs ag:leading-6 ag:text-ag-muted">
            {{ type.size }} / {{ type.lineHeight }} · {{ type.usage }}
          </p>
        </div>
      </div>
    </DesignSection>

    <div class="ag:grid ag:gap-x-12 ag:md:grid-cols-2">
      <DesignSection
        id="spacing"
        title="间距"
        description="基于 4px 栅格。面板内边距使用 md/lg，区块间距使用 xl/2xl。"
      >
        <div class="ag:space-y-4">
          <div
            v-for="space in spacing"
            :key="space.name"
            class="ag:grid ag:grid-cols-[40px_1fr_48px] ag:items-center ag:gap-4"
          >
            <code class="ag:text-xs ag:text-ag-muted">{{ space.name }}</code>
            <span
              class="ag:h-2 ag:rounded ag:bg-ag-gold/60"
              :style="{ width: `var(--ag-ui-space-${space.name})` }"
            ></span>
            <span class="ag:font-mono ag:text-xs ag:text-ag-mist">{{ space.value }}</span>
          </div>
        </div>
      </DesignSection>
      <DesignSection
        id="motion"
        title="动效"
        description="金线流动感通过透明度与位移表达，不使用弹跳和超长缓动。尊重系统的减少动态效果设置。"
      >
        <div class="ag:space-y-3">
          <UiPanel v-for="duration in motion" :key="duration.name" class="ag:p-4">
            <p class="ag:font-mono ag:text-sm">{{ duration.name }} · {{ duration.value }}</p>
            <p class="ag:mt-2 ag:text-xs ag:text-ag-muted">{{ duration.usage }}</p>
          </UiPanel>
        </div>
      </DesignSection>
    </div>

    <DesignSection
      id="components"
      title="组件"
      description="控件状态包含默认、悬停、聚焦与禁用。房号与遥控链接使用等宽字体。按钮和输入支持 40px（md）与 44px（lg）；同一行使用相同尺寸，图标与文字间距为 8px。功能面板内边距为 16px，宽松布局为 24px。"
    >
      <div class="ag:grid ag:gap-6 ag:lg:grid-cols-2">
        <UiPanel class="ag:p-6">
          <h3 class="ag-display ag:text-xl">按钮与输入</h3>
          <div class="ag:mt-4 ag:flex ag:flex-wrap ag:gap-2">
            <UiButton>主操作</UiButton>
            <UiButton variant="success">在线</UiButton>
            <UiButton variant="ghost">次级</UiButton>
            <UiButton variant="danger">退出房间</UiButton>
            <UiButton disabled>禁用</UiButton>
          </div>
          <label for="design-room-code" class="ag:mt-6 ag:mb-2 ag:block ag:text-xs ag:text-ag-muted"
            >房间号示例</label
          >
          <UiInput
            id="design-room-code"
            v-model="roomCode"
            maxlength="6"
            class="ag:font-mono ag:uppercase ag:tracking-[0.18em]"
          />
          <div class="ag:mt-4 ag:flex ag:items-center ag:gap-2">
            <UiInput
              v-model="roomCode"
              size="md"
              aria-label="并排房间号示例"
              maxlength="6"
              class="ag:flex-1 ag:font-mono ag:uppercase ag:tracking-[0.18em]"
            />
            <UiButton variant="success">加入</UiButton>
          </div>
          <div class="ag:mt-4 ag:flex ag:flex-wrap ag:gap-2">
            <UiBadge tone="success">已连接</UiBadge>
            <UiBadge>连接中</UiBadge>
            <UiBadge tone="danger">异常</UiBadge>
          </div>
        </UiPanel>
        <UiPanel class="ag:p-6">
          <h3 class="ag-display ag:text-xl">房间卡片</h3>
          <div class="ag:mt-4 ag:rounded-lg ag:border ag:border-ag-gold/30 ag:bg-ag-ink ag:p-4">
            <div class="ag:flex ag:items-center ag:justify-between">
              <div>
                <p class="ag:font-mono ag:text-[11px] ag:tracking-[0.18em] ag:text-ag-muted">
                  ROOM CODE
                </p>
                <p class="ag:mt-1 ag:font-mono ag:text-2xl ag:tracking-[0.18em] ag:text-ag-gold">
                  8F3K2Q
                </p>
              </div>
              <UiBadge tone="success">在线</UiBadge>
            </div>
            <div class="ag:mt-4 ag:flex ag:justify-between ag:gap-3 ag:text-xs ag:text-ag-muted">
              <span>当前进度</span><code>12:48 / 24:10</code>
            </div>
            <div
              role="progressbar"
              aria-label="播放进度示例"
              :aria-valuenow="53"
              :aria-valuemin="0"
              :aria-valuemax="100"
              class="ag:mt-3 ag:h-1 ag:overflow-hidden ag:rounded ag:bg-white/10"
            >
              <div class="ag:h-full ag:w-[53%] ag:bg-ag-gold"></div>
            </div>
          </div>
          <ul class="ag:mt-4">
            <li
              v-for="member in members"
              :key="member.role"
              class="ag:flex ag:items-center ag:justify-between ag:gap-3 ag:border-b ag:border-white/10 ag:py-3 ag:text-xs"
            >
              <span class="ag:flex ag:items-center ag:gap-2"
                ><span
                  aria-hidden="true"
                  class="ag:h-1.5 ag:w-1.5 ag:rounded-full"
                  :class="member.color"
                ></span
                >{{ member.name }}</span
              >
              <span
                class="ag:font-mono ag:text-[10px] ag:uppercase ag:tracking-wider ag:text-ag-muted"
                >{{ member.role }}</span
              >
            </li>
          </ul>
        </UiPanel>
      </div>
    </DesignSection>

    <DesignSection
      id="illustration"
      title="插画使用"
      description="角色插画只用于首屏氛围与设计说明，不进入控件内部。大图出现时需要留出金色缎带的负空间，保证标题与房间信息始终叠在较暗画面上；功能页面不使用模糊或纯装饰背景图。"
    >
      <div class="ag:grid ag:gap-4 ag:md:grid-cols-3">
        <UiPanel v-for="rule in illustrationRules" :key="rule.text" class="ag:p-5">
          <h3 class="ag-display ag:text-2xl" :class="rule.color">{{ rule.title }}</h3>
          <p class="ag:mt-3 ag:text-xs ag:leading-6 ag:text-ag-muted">{{ rule.text }}</p>
        </UiPanel>
      </div>
      <ul class="ag:mt-8 ag:space-y-3 ag:text-sm ag:leading-7 ag:text-ag-muted">
        <li v-for="principle in principles" :key="principle">{{ principle }}</li>
      </ul>
    </DesignSection>
  </div>
</template>
