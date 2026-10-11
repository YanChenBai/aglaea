<script setup vapor lang="ts">
import { DoorOpen, Puzzle, Radio, Smartphone } from 'lucide-vue-next';

import MotionReveal from './MotionReveal.vue';

const steps = [
  {
    title: '创建房间',
    icon: DoorOpen,
    body: '打开网页大厅，创建房间并记下六位房间号，也可以直接输入房间号查询已有房间。',
  },
  {
    title: '插件加入',
    icon: Puzzle,
    body: '打开插件弹窗，填入服务端地址与显示名称；主持时创建房间，跟随时输入房间号加入。',
  },
  {
    title: '自动同步',
    icon: Radio,
    body: '回到任意 B 站视频页，插件自动读取播放状态并上报；房主端的播放、暂停与切集会广播给全房间。',
  },
  {
    title: '手机遥控',
    icon: Smartphone,
    body: '房主在弹窗里生成手机遥控链接，手机打开即可遥控，链接在房间存续期间有效。',
  },
];
</script>

<template>
  <section id="usage" class="ag:mx-auto ag:max-w-6xl ag:scroll-mt-20 ag:px-6 ag:py-24 ag:md:py-28">
    <div class="ag:flex ag:flex-wrap ag:items-end ag:justify-between ag:gap-5">
      <div class="ag-section-heading">
        <p class="ag-eyebrow">GETTING STARTED</p>
        <h2 class="ag-display ag:text-ag-paper">四步开看</h2>
      </div>
      <p class="ag:text-xs ag:leading-6 ag:text-ag-muted">从一个房间，走向每一块屏幕。</p>
    </div>

    <ol class="ag:relative ag:mt-12 ag:grid ag:gap-0 ag:md:grid-cols-4">
      <MotionReveal
        as="li"
        v-for="(step, index) in steps"
        :key="step.title"
        :delay="index * 0.08"
        class="usage-step ag:relative ag:pb-9 ag:pl-10 ag:md:pr-8 ag:md:pb-0 ag:md:pl-0"
      >
        <div class="ag:flex ag:items-center ag:gap-3 ag:md:pb-7">
          <span class="ag:font-mono ag:text-[11px] ag:tracking-widest ag:text-ag-gold/60"
            >0{{ index + 1 }}</span
          >
          <component
            :is="step.icon"
            :size="21"
            :stroke-width="1.3"
            class="ag:text-ag-gold-pale/80"
            aria-hidden="true"
          />
        </div>
        <h3 class="ag-display ag:mt-4 ag:text-xl ag:text-ag-paper ag:md:mt-7">{{ step.title }}</h3>
        <p class="ag:mt-3 ag:max-w-xs ag:text-xs ag:leading-7 ag:text-ag-muted">{{ step.body }}</p>
      </MotionReveal>
    </ol>
  </section>
</template>

<style scoped>
.usage-step::before {
  content: '';
  position: absolute;
  top: 6px;
  bottom: 0;
  left: 4px;
  width: 1px;
  background: linear-gradient(var(--ag-ui-gold), rgba(216, 180, 106, 0.14));
  opacity: 0.35;
}
.usage-step::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 2px;
  width: 5px;
  height: 5px;
  background: var(--ag-ui-gold);
  transform: rotate(45deg);
}
@media (min-width: 768px) {
  .usage-step::before {
    top: 48px;
    right: 0;
    bottom: auto;
    left: 0;
    width: auto;
    height: 1px;
    background: linear-gradient(90deg, var(--ag-ui-gold), rgba(216, 180, 106, 0.14));
  }
  .usage-step::after {
    top: 46px;
    left: 0;
  }
}
</style>
