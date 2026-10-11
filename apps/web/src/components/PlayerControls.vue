<script setup vapor lang="ts">
import type { ControlAction } from '@aglaea/shared';
import { UiButton, UiPanel } from '@aglaea/ui';
import { computed, ref } from 'vue';

import { formatClock } from '../composables/useFormat.ts';

const props = defineProps<{
  position: number;
  duration: number;
  paused: boolean;
  volume: number;
  enabled: boolean;
  personalEnabled?: boolean;
  hidePlaybackControls?: boolean;
}>();

const emit = defineEmits<{
  control: [action: ControlAction];
  volume: [value: number];
}>();

const dragPosition = ref<number>();
const shownPosition = computed(() => dragPosition.value ?? props.position);

function onSeek(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);
  dragPosition.value = value;
  emit('control', { type: 'seek', position: value });
  setTimeout(() => {
    dragPosition.value = undefined;
  }, 200);
}
</script>

<template>
  <UiPanel as="section" class="ag:p-4">
    <div class="ag:flex ag:items-end ag:justify-between ag:font-mono ag:text-xs ag:text-ag-muted">
      <span class="ag-tabular">{{ formatClock(shownPosition) }}</span>
      <span class="ag-tabular">{{ formatClock(duration) }}</span>
    </div>
    <input
      v-if="!hidePlaybackControls"
      class="ag-ui-range ag:mt-2"
      type="range"
      aria-label="播放进度"
      min="0"
      :max="Math.max(duration, 1)"
      step="1"
      :value="shownPosition"
      :disabled="!enabled"
      @change="onSeek"
    />

    <div v-if="!hidePlaybackControls" class="ag:mt-5 ag:grid ag:grid-cols-4 ag:gap-2">
      <UiButton
        variant="ghost"
        v-for="step in [-30, -10, 10, 30]"
        :key="step"
        :disabled="!enabled"
        @click="emit('control', { type: 'skip', delta: step })"
      >
        {{ step > 0 ? `+${step}s` : `${step}s` }}
      </UiButton>
    </div>

    <div v-if="!hidePlaybackControls" class="ag:mt-3 ag:grid ag:grid-cols-3 ag:gap-2">
      <UiButton variant="ghost" :disabled="!enabled" @click="emit('control', { type: 'prev' })">
        上一集
      </UiButton>
      <UiButton variant="primary" :disabled="!enabled" @click="emit('control', { type: 'toggle' })">
        {{ paused ? '播放' : '暂停' }}
      </UiButton>
      <UiButton variant="ghost" :disabled="!enabled" @click="emit('control', { type: 'next' })">
        下一集
      </UiButton>
    </div>

    <div class="ag:mt-3 ag:grid ag:grid-cols-2 ag:gap-2">
      <UiButton
        variant="success"
        :disabled="!(personalEnabled ?? enabled)"
        @click="emit('control', { type: 'fullscreen' })"
      >
        切换网页全屏
      </UiButton>
      <UiButton
        variant="ghost"
        :disabled="!(personalEnabled ?? enabled)"
        @click="emit('control', { type: 'resync' })"
      >
        <svg
          class="ag:shrink-0"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0112-1l2 3M4 15l2 3a7 7 0 0012-1" />
        </svg>
        手动同步
      </UiButton>
    </div>

    <label
      for="remote-volume"
      class="ag:mt-5 ag:block ag:text-[11px] ag:uppercase ag:tracking-[0.2em] ag:text-ag-muted"
    >
      音量 · {{ Math.round(volume * 100) }}
    </label>
    <input
      class="ag-ui-range ag:mt-2"
      type="range"
      min="0"
      id="remote-volume"
      max="1"
      step="0.02"
      :value="volume"
      :disabled="!(personalEnabled ?? enabled)"
      @change="emit('volume', Number(($event.target as HTMLInputElement).value))"
    />
  </UiPanel>
</template>
