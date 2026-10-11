<script setup lang="ts">
import { MonitorPlay, Radio, Users, Smartphone, Play, Pause } from 'lucide-vue-next';
import { useReducedMotion } from 'motion-v';
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';

import GoldenWeave from './GoldenWeave.vue';
import MotionReveal from './MotionReveal.vue';
import ThreadMedallion from './ThreadMedallion.vue';

const diagram = ref<HTMLElement | null>(null);
const inView = ref(false);
const playing = ref(true);
const visible = ref(true);
const reducedMotion = useReducedMotion();

const running = computed(
  () => inView.value && playing.value && visible.value && !reducedMotion.value,
);

let observer: IntersectionObserver | undefined;
onMounted(() => {
  if (!diagram.value) {
    return;
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      inView.value = entry?.isIntersecting ?? false;
    },
    { threshold: 0.1 },
  );
  observer.observe(diagram.value);
});
onUnmounted(() => observer?.disconnect());
watchEffect(onCleanup => {
  const update = () => {
    visible.value = !document.hidden;
  };

  update();
  document.addEventListener('visibilitychange', update);
  onCleanup(() => document.removeEventListener('visibilitychange', update));
});

const endpoints = [
  {
    name: '房主播放器',
    description: '读取进度 · 执行播控',
    type: 'owner',
    icon: MonitorPlay,
    x: 8,
    y: 25,
  },
  {
    name: '手机遥控',
    description: '播放 · 暂停 · 切集',
    type: 'phone',
    icon: Smartphone,
    x: 8,
    y: 75,
  },
  { name: '成员播放器', description: '跟随房主进度', type: 'member', icon: Users, x: 92, y: 25 },
  { name: '更多成员', description: '共享同一刻', type: 'member', icon: MonitorPlay, x: 92, y: 75 },
];
</script>

<template>
  <section id="how" class="ag:scroll-mt-20">
    <div class="ag:mx-auto ag:max-w-6xl ag:px-6 ag:py-24 ag:md:py-28">
      <MotionReveal class="ag:flex ag:flex-wrap ag:items-end ag:justify-between ag:gap-5">
        <div class="ag-section-heading">
          <p class="ag-eyebrow">HOW IT WORKS</p>
          <h2 class="ag-display ag:text-ag-paper">将彼此，织进同一刻</h2>
        </div>
        <div class="ag:flex ag:items-center ag:gap-5">
          <p class="ag:max-w-xs ag:text-xs ag:leading-6 ag:text-ag-muted">
            房主的进度，沿金线抵达每一个屏幕。
          </p>
          <button
            v-if="!reducedMotion"
            type="button"
            :aria-label="playing ? '暂停流程动画' : '播放流程动画'"
            @click="playing = !playing"
            class="ag-focus ag:flex ag:size-8 ag:cursor-pointer ag:items-center ag:justify-center ag:rounded-full ag:hover:bg-white/5 ag:hover:text-ag-gold"
          >
            <component :is="playing ? Pause : Play" :size="13" aria-hidden="true" />
          </button>
        </div>
      </MotionReveal>
      <div
        ref="diagram"
        :data-animation="running ? 'running' : 'paused'"
        class="ag:relative ag:-mt-4 ag:h-[240px] ag:[--weave-inset:8%] ag:md:h-[260px] ag:md:[--weave-inset:5%]"
        role="img"
        aria-label="房主向房间上报进度，房间同步给多个成员；手机向房间发出指令，再由房主执行"
      >
        <GoldenWeave :running="running" />
        <div
          v-for="node in endpoints"
          :key="node.name"
          :style="{
            left: node.x === 8 ? 'var(--weave-inset)' : 'calc(100% - var(--weave-inset))',
            top: (node.y === 25 ? 26 : 74) + '%',
          }"
          class="ag:absolute ag:flex ag:w-20 ag:-translate-x-1/2 ag:-translate-y-5 ag:flex-col ag:items-center ag:text-center ag:md:w-auto ag:md:min-w-20 ag:md:-translate-y-6"
        >
          <ThreadMedallion>
            <component :is="node.icon" :size="22" :stroke-width="1.2" aria-hidden="true" />
          </ThreadMedallion>
          <h3 class="ag:mt-2 ag:text-[11px] ag:text-ag-paper ag:md:text-sm">{{ node.name }}</h3>
          <p class="ag:mt-1 ag:hidden ag:text-[10px] ag:text-ag-muted ag:md:block">
            {{ node.description }}
          </p>
        </div>
        <div
          class="ag:absolute ag:top-1/2 ag:left-1/2 ag:flex ag:w-28 ag:-translate-x-1/2 ag:-translate-y-7 ag:flex-col ag:items-center ag:text-center ag:md:-translate-y-8"
        >
          <ThreadMedallion featured>
            <Radio
              :size="28"
              :stroke-width="1"
              class="ag:text-ag-gold-pale ag:drop-shadow-[0_0_14px_rgba(216,180,106,0.7)]"
              aria-hidden="true"
            />
          </ThreadMedallion>
          <h3 class="ag:mt-3 ag:text-xs ag:text-ag-gold-pale ag:md:text-sm">同步房间</h3>
          <p class="ag:mt-1 ag:font-mono ag:text-[9px] ag:tracking-widest ag:text-ag-muted">
            THE GOLDEN THREAD
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
