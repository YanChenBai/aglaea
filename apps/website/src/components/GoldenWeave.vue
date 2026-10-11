<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';

import { createGoldenWeave } from '../effects/golden-weave.ts';
import type { ShaderRenderer } from '../effects/shader-effect.ts';

const props = defineProps<{ running: boolean }>();
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const supported = ref(false);
let renderer: ShaderRenderer | undefined;
let observer: ResizeObserver | undefined;
let target: HTMLCanvasElement | undefined;

function initialize(): void {
  if (!target) {
    return;
  }

  renderer = createGoldenWeave(target);
  supported.value = Boolean(renderer);
  renderer?.setRunning(props.running);
}

function onContextLost(event: Event): void {
  event.preventDefault();
  renderer?.dispose();
  renderer = undefined;
  supported.value = false;
}

watch(
  () => props.running,
  running => renderer?.setRunning(running),
);
onMounted(() => {
  if (!canvas.value) {
    return;
  }

  target = canvas.value;
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
  <div class="ag:pointer-events-none ag:absolute ag:inset-0 ag:overflow-hidden" aria-hidden="true">
    <div
      class="ag:absolute ag:top-0 ag:left-1/2 ag:h-full ag:-translate-x-1/2"
      style="width: calc((100% - var(--weave-inset, 8%) * 2) / 0.84)"
    >
      <svg
        v-if="!supported"
        viewBox="0 0 1000 400"
        preserveAspectRatio="none"
        class="ag:absolute ag:h-full ag:w-full"
        fill="none"
        stroke="var(--ag-ui-gold)"
        stroke-opacity=".3"
      >
        <g
          v-for="offset in [-12, -6, 0, 6, 12]"
          :key="offset"
          :transform="`translate(0 ${offset})`"
        >
          <path d="M80 104C280 104 410 246 500 200S720 104 920 104" />
          <path d="M80 296C280 296 410 154 500 200S720 296 920 296" />
        </g>
      </svg>
      <canvas ref="canvas" class="ag:absolute ag:inset-0 ag:h-full ag:w-full"></canvas>
    </div>
  </div>
</template>
