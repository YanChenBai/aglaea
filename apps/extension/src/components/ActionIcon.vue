<script setup vapor lang="ts">
import { iconPaths } from '../icons.ts';
defineProps<{ name: keyof typeof iconPaths }>();
</script>

<template>
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="ag:shrink-0"
  >
    <path :d="iconPaths[name]" />
  </svg>
</template>
