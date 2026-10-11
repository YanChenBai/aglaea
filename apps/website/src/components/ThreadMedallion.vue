<script setup vapor lang="ts">
defineProps<{ featured?: boolean }>();
</script>

<template>
  <div
    class="ag:relative ag:flex ag:shrink-0 ag:items-center ag:justify-center ag:text-ag-gold-pale"
    :class="featured ? 'ag:size-14 ag:md:size-16' : 'ag:size-10 ag:md:size-12'"
  >
    <span
      v-if="featured"
      class="ag:absolute ag:size-12 ag:rotate-45 ag:rounded-xl ag:border ag:border-ag-gold/25 ag:bg-[linear-gradient(135deg,rgba(216,180,106,0.06),var(--ag-ui-ink)_65%)] ag:md:size-15"
      aria-hidden="true"
    ></span>
    <span
      v-else
      class="ag:absolute ag:bottom-1 ag:h-px ag:w-7 ag:bg-[linear-gradient(90deg,transparent,rgba(216,180,106,0.55),transparent)]"
      aria-hidden="true"
    ></span>
    <span
      class="ag:relative ag:flex ag:items-center ag:justify-center ag:drop-shadow-[0_0_10px_rgba(216,180,106,0.2)]"
      ><slot
    /></span>
  </div>
</template>
