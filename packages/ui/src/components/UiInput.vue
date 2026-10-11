<script setup vapor lang="ts">
import type { ControlSize } from '../types.ts';

withDefaults(defineProps<{ type?: string; disabled?: boolean; size?: ControlSize }>(), {
  type: 'text',
  disabled: false,
  size: 'lg',
});

const model = defineModel<string>({ required: true });
</script>

<template>
  <input
    class="ag-ui-input"
    :class="`ag-ui-input--${size}`"
    :type="type"
    :disabled="disabled"
    v-model="model"
  />
</template>
