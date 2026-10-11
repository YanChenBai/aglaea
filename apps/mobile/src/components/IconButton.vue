<script setup lang="ts">
defineProps<{ icon: string; label: string; disabled?: boolean }>();
const emit = defineEmits<{ tap: [] }>();
</script>

<template>
  <GridLayout
    height="44"
    accessibilityRole="button"
    :accessibilityLabel="label"
    :isEnabled="!disabled"
    :opacity="disabled ? 0.35 : 1"
    @tap="emit('tap')"
  >
    <Image :src="`res://${icon}`" width="20" height="20" stretch="aspectFit" />
  </GridLayout>
</template>
