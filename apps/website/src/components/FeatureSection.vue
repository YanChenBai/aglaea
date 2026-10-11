<script setup vapor lang="ts">
import { Radio, Clock3, Users, Smartphone, Waypoints, TimerReset } from 'lucide-vue-next';

import MotionReveal from './MotionReveal.vue';

const features = [
  { title: '持续同步', body: '房主播放、暂停或切集，成员跟随同一份进度。', icon: Radio },
  { title: '时钟对齐', body: '校准时钟与播放偏移，让每个屏幕跟上同一拍。', icon: Clock3 },
  { title: '角色分工', body: '房主掌握播放，成员跟随，遥控端发出指令。', icon: Users },
  { title: '手机遥控', body: '打开分享链接，从掌心掌握播放、切集与网页全屏。', icon: Smartphone },
  { title: '跳转同步', body: '拖动进度或调整倍速，成员随即跟上。', icon: Waypoints },
  { title: '自动回收', body: '房间到期自动清理，无需手动收尾。', icon: TimerReset },
];
</script>

<template>
  <section
    id="features"
    class="ag:mx-auto ag:max-w-6xl ag:scroll-mt-20 ag:px-6 ag:py-24 ag:md:py-28"
  >
    <MotionReveal class="ag-section-heading">
      <p class="ag-eyebrow">FEATURES</p>
      <h2 class="ag-display ag:text-ag-paper">一个房间，一个节拍</h2>
    </MotionReveal>
    <div
      class="ag:mt-10 ag:grid ag:gap-x-12 ag:gap-y-9 ag:pt-8 ag:sm:grid-cols-2 ag:lg:grid-cols-3"
    >
      <MotionReveal
        as="article"
        v-for="(feature, index) in features"
        :key="feature.title"
        :delay="index * 0.04"
        class="ag:flex ag:items-start ag:gap-3"
      >
        <component
          :is="feature.icon"
          :size="17"
          :stroke-width="1.3"
          class="ag:mt-1 ag:shrink-0 ag:text-ag-gold/65"
          aria-hidden="true"
        />
        <div>
          <h3 class="ag-display ag:text-xl ag:text-ag-paper">{{ feature.title }}</h3>
          <p class="ag:mt-2 ag:text-xs ag:leading-6 ag:text-ag-muted">{{ feature.body }}</p>
        </div>
      </MotionReveal>
    </div>
  </section>
</template>
