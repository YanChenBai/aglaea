<script setup vapor lang="ts">
import { Github } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';

import { websiteLinks } from '../links.ts';

const links = [
  { href: '/#features', label: '功能' },
  { href: '/#how', label: '工作原理' },
  { href: '/#usage', label: '使用流程' },
  { href: '/#deploy', label: '自部署' },
];
</script>

<template>
  <header
    class="ag:fixed ag:inset-x-0 ag:top-0 ag:z-50 ag:border-b ag:border-ag-gold/10 ag:bg-ag-ink/80 ag:backdrop-blur"
  >
    <div class="ag:mx-auto ag:flex ag:h-16 ag:max-w-6xl ag:items-center ag:justify-between ag:px-6">
      <a href="/#top" class="ag:flex ag:items-center ag:gap-3 ag:no-underline">
        <img
          :src="'/icons/aglaea-head-128.png'"
          alt=""
          width="32"
          height="32"
          class="ag:shrink-0"
        />
        <span class="ag-display ag:text-2xl ag:text-ag-gold">Aglaea</span>
      </a>
      <nav class="ag:hidden ag:items-center ag:gap-6 ag:md:flex">
        <a
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          class="ag:text-sm ag:text-ag-mist ag:no-underline ag:transition-colors ag:hover:text-ag-gold"
          >{{ link.label }}</a
        >
        <RouterLink
          to="/design"
          class="ag-focus ag:text-sm ag:text-ag-mist ag:no-underline ag:hover:text-ag-gold"
          active-class="ag:text-ag-gold"
          >设计规范</RouterLink
        >
      </nav>
      <div class="ag:flex ag:items-center ag:gap-1">
        <RouterLink
          to="/design"
          aria-label="设计规范"
          class="ag-focus ag:text-xs ag:text-ag-mist ag:no-underline ag:hover:text-ag-gold ag:md:hidden"
          >设计</RouterLink
        >
        <a
          :href="websiteLinks.repository"
          aria-label="GitHub 仓库"
          title="GitHub 仓库"
          target="_blank"
          rel="noopener noreferrer"
          class="ag-focus ag:flex ag:size-8 ag:items-center ag:justify-center ag:rounded-full ag:text-ag-muted ag:transition-colors ag:hover:bg-ag-gold/5 ag:hover:text-ag-gold"
          ><Github :size="17" :stroke-width="1.4" aria-hidden="true"
        /></a>
      </div>
    </div>
  </header>
</template>
