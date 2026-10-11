<script setup vapor lang="ts">
import { useReducedMotion } from 'motion-v';
import { onMounted, onUnmounted, useTemplateRef, watch } from 'vue';

import { createHeroGlow, type HeroGlowRenderer } from '../effects/hero-glow.ts';

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const reducedMotion = useReducedMotion();
let renderer: HeroGlowRenderer | undefined;
let resizeObserver: ResizeObserver | undefined;
let intersectionObserver: IntersectionObserver | undefined;
let visible = true;
let target: HTMLCanvasElement | undefined;

function updateRunning(): void {
  renderer?.setRunning(visible && !document.hidden);
}

function onContextLost(event: Event): void {
  event.preventDefault();
  renderer?.dispose();
  renderer = undefined;
}

function initialize(): void {
  if (!canvas.value) {
    return;
  }

  renderer = createHeroGlow(canvas.value);
  renderer?.setReducedMotion(reducedMotion.value);
  updateRunning();
}

watch(reducedMotion, value => renderer?.setReducedMotion(value));

onMounted(() => {
  if (!canvas.value) {
    return;
  }

  target = canvas.value;
  initialize();
  resizeObserver = new ResizeObserver(() => renderer?.resize());
  resizeObserver.observe(canvas.value);
  intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    updateRunning();
  });
  intersectionObserver.observe(canvas.value);
  document.addEventListener('visibilitychange', updateRunning);
  canvas.value.addEventListener('webglcontextlost', onContextLost);
  canvas.value.addEventListener('webglcontextrestored', initialize);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', updateRunning);
  target?.removeEventListener('webglcontextlost', onContextLost);
  target?.removeEventListener('webglcontextrestored', initialize);
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  renderer?.dispose();
});
</script>

<template>
  <div class="ag:pointer-events-none ag:absolute ag:inset-0" aria-hidden="true">
    <div
      class="ag:absolute ag:inset-0 ag:bg-[radial-gradient(ellipse_at_75%_48%,rgba(216,180,106,0.07),transparent_52%)]"
    ></div>
    <canvas
      ref="canvas"
      class="ag:absolute ag:inset-0 ag:h-full ag:w-full ag:opacity-75 ag:md:opacity-100"
    ></canvas>
  </div>
</template>
