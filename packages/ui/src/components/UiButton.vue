<script setup vapor lang="ts">
import type { ButtonVariant, ControlSize } from '../types.ts';

withDefaults(
  defineProps<{
    variant?: ButtonVariant;
    size?: ControlSize;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    icon?: boolean;
  }>(),
  { variant: 'primary', size: 'md', type: 'button', disabled: false },
);
</script>

<template>
  <button
    class="ag-ui-button"
    :class="[`ag-ui-button--${variant}`, `ag-ui-button--${size}`, { 'ag-ui-button--icon': icon }]"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
