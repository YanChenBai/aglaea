<script setup vapor lang="ts">
withDefaults(defineProps<{ as?: 'div' | 'section' | 'article' | 'li' }>(), { as: 'div' });
</script>

<template>
  <component :is="as" class="ag-panel"><slot /></component>
</template>
