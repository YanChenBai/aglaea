<script setup vapor lang="ts">
import type { ButtonVariant, ControlSize } from '../types.ts';

withDefaults(defineProps<{ variant?: ButtonVariant; size?: ControlSize; href: string }>(), {
  variant: 'primary',
  size: 'md',
});
</script>

<template>
  <a
    class="ag-ui-button"
    :class="[`ag-ui-button--${variant}`, `ag-ui-button--${size}`]"
    :href="href"
    ><slot
  /></a>
</template>
