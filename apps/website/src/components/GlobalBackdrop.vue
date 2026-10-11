<script setup vapor lang="ts">
import { useDocumentVisibility } from '@vueuse/core';
import { useReducedMotion } from 'motion-v';
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';

import { createAmbientGlow } from '../effects/ambient-glow.ts';
import type { ShaderRenderer } from '../effects/shader-effect.ts';

const visibility = useDocumentVisibility();
const reducedMotion = useReducedMotion();
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const supported = ref(false);
let renderer: ShaderRenderer | undefined;
let observer: ResizeObserver | undefined;
let target: HTMLCanvasElement | undefined;

function initialize(): void {
  if (!target) {
    return;
  }

  renderer = createAmbientGlow(target);
  supported.value = Boolean(renderer);
  renderer?.setReducedMotion(reducedMotion.value);
  renderer?.setRunning(visibility.value === 'visible');
}

function onContextLost(event: Event): void {
  event.preventDefault();
  renderer?.dispose();
  renderer = undefined;
  supported.value = false;
}

watch(visibility, value => renderer?.setRunning(value === 'visible'));
watch(reducedMotion, value => renderer?.setReducedMotion(value));

onMounted(() => {
  target = canvas.value ?? undefined;

  if (!target) {
    return;
  }

  initialize();
  observer = new ResizeObserver(() => renderer?.resize());
  observer.observe(target);
  target.addEventListener('webglcontextlost', onContextLost);
  target.addEventListener('webglcontextrestored', initialize);
});

onUnmounted(() => {
  observer?.disconnect();
  target?.removeEventListener('webglcontextlost', onContextLost);
  target?.removeEventListener('webglcontextrestored', initialize);
  renderer?.dispose();
});
</script>

<template>
  <div class="ag-ambient" :class="{ 'ag-ambient-supported': supported }" aria-hidden="true">
    <canvas ref="canvas" class="ag:absolute ag:inset-0 ag:h-full ag:w-full"></canvas>
  </div>
</template>
