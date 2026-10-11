<script setup vapor lang="ts">
defineProps<{ id: string; title: string; description: string }>();
</script>

<template>
  <section :id="id" class="ag:scroll-mt-24 ag:border-t ag:border-white/10 ag:py-12">
    <h2 class="ag-display ag:text-3xl">{{ title }}</h2>
    <p class="ag:mt-3 ag:max-w-3xl ag:text-sm ag:leading-7 ag:text-ag-muted">{{ description }}</p>
    <div class="ag:mt-6"><slot /></div>
  </section>
</template>
