<script setup vapor lang="ts">
withDefaults(
  defineProps<{
    compact?: boolean;
    href?: string;
  }>(),
  { compact: false, href: '/' },
);
</script>

<template>
  <a class="ag:flex ag:items-center ag:gap-3 ag:no-underline" :href="href">
    <img :src="'/icons/aglaea-head-128.png'" alt="" width="32" height="32" class="ag:shrink-0" />
    <span class="ag-display ag:text-2xl ag:text-ag-gold">Aglaea</span>
    <span v-if="!compact" class="ag:text-[11px] ag:uppercase ag:tracking-[0.28em] ag:text-ag-muted"
      >同步观影</span
    >
  </a>
</template>
