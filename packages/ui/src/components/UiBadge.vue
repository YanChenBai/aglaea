<script setup vapor lang="ts">
import type { BadgeTone } from '../types.ts';

withDefaults(defineProps<{ tone?: BadgeTone }>(), { tone: 'warning' });
</script>

<template>
  <span class="ag-ui-badge" :class="`ag-ui-badge--${tone}`"><slot /></span>
</template>
