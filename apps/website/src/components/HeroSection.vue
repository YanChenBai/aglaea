<script setup lang="ts">
import { UiButtonLink } from '@aglaea/ui';
import { ArrowDown, ArrowUpRight, Play, Sparkles, Download } from 'lucide-vue-next';
import { Motion, useReducedMotion } from 'motion-v';

import { websiteLinks } from '../links.ts';
import HeroGlow from './HeroGlow.vue';

const reducedMotion = useReducedMotion();
const enter = { opacity: 1, y: 0 };
</script>

<template>
  <section
    id="top"
    class="ag:relative ag:isolate ag:flex ag:min-h-svh ag:items-center ag:overflow-hidden ag:bg-ag-ink"
  >
    <HeroGlow />
    <div
      class="ag:relative ag:z-10 ag:mx-auto ag:w-full ag:max-w-6xl ag:px-6 ag:pt-32 ag:pb-24 ag:md:pt-36"
    >
      <Motion
        as="p"
        :initial="reducedMotion ? false : { opacity: 0, y: 12 }"
        :animate="enter"
        :transition="{ duration: 0.8 }"
        class="ag-eyebrow ag:flex ag:items-center ag:gap-3"
      >
        <Sparkles :size="15" :stroke-width="1.4" aria-hidden="true" /> AGLAEA · GOLDEN THREADS
      </Motion>
      <Motion
        as="h1"
        :initial="reducedMotion ? false : { opacity: 0, y: 24 }"
        :animate="enter"
        :transition="{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }"
        class="ag-display ag:mt-7 ag:text-[40px] ag:leading-[1.3] ag:tracking-tight ag:text-ag-paper ag:sm:text-5xl ag:lg:text-[64px]"
      >
        让散落的时刻，<br /><span class="ag:text-ag-gold-pale">循同一缕金线。</span>
      </Motion>
      <Motion
        as="div"
        :initial="reducedMotion ? false : { opacity: 0, y: 16 }"
        :animate="enter"
        :transition="{ duration: 0.8, delay: 0.25 }"
      >
        <p class="ag:mt-7 ag:text-sm ag:tracking-wide ag:text-ag-mist">
          身处彼方，共享此刻。B 站同步观影，由金线相连。
        </p>
        <div class="ag:mt-8 ag:flex ag:flex-wrap ag:gap-3">
          <Motion
            as="div"
            :while-hover="reducedMotion ? undefined : { y: -2 }"
            :while-press="reducedMotion ? undefined : { scale: 0.98 }"
          >
            <UiButtonLink variant="primary" href="#usage" class="ag-site-cta"
              ><Play :size="14" :stroke-width="1.5" aria-hidden="true" /> 开始共织</UiButtonLink
            >
          </Motion>
          <UiButtonLink variant="ghost" href="#how" class="ag-site-link"
            >工作原理 <ArrowUpRight :size="15" :stroke-width="1.4" aria-hidden="true"
          /></UiButtonLink>
          <UiButtonLink
            v-if="websiteLinks.extensionDownload"
            :href="websiteLinks.extensionDownload"
            variant="primary"
            class="ag-site-cta"
            ><Download :size="14" aria-hidden="true" /> 下载浏览器插件</UiButtonLink
          >
        </div>
      </Motion>
    </div>
    <div
      class="ag:pointer-events-none ag:absolute ag:inset-x-0 ag:bottom-0 ag:h-24 ag:bg-linear-to-t ag:from-ag-ink ag:to-transparent"
      aria-hidden="true"
    ></div>
    <a
      href="#features"
      aria-label="探索功能"
      class="ag-focus ag:absolute ag:bottom-6 ag:left-1/2 ag:z-10 ag:-translate-x-1/2 ag:text-ag-gold/60 ag:hover:text-ag-gold"
      ><ArrowDown :size="18" :stroke-width="1.2" aria-hidden="true"
    /></a>
  </section>
</template>
