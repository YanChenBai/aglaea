<script setup vapor lang="ts">
import { UiBadge, UiButton, UiPanel } from '@aglaea/ui';
import { computed } from 'vue';

const props = defineProps<{
  roomCode?: string;
  ownerName?: string;
  memberCount: number;
  paused?: boolean;
  hasRoom: boolean;
}>();

const emit = defineEmits<{
  copy: [];
  control: [];
}>();

const stateLabel = computed(() => {
  if (!props.hasRoom) {
    return '待创建';
  }

  return props.paused ? '暂停中' : '播放中';
});
</script>

<template>
  <UiPanel as="div" class="ag:relative ag:overflow-hidden ag:p-6">
    <div
      class="ag-hairline ag:pointer-events-none ag:absolute ag:inset-x-0 ag:top-0 ag:h-0.5"
    ></div>
    <div class="ag:flex ag:items-start ag:justify-between">
      <div>
        <p class="ag:text-[10px] ag:uppercase ag:tracking-[0.24em] ag:text-ag-muted">
          Room Snapshot
        </p>
        <p class="ag:mt-2 ag:font-mono ag:text-3xl ag:tracking-[0.18em] ag:text-ag-gold">
          {{ roomCode ?? 'AGLAEA' }}
        </p>
      </div>
      <UiBadge tone="success">
        {{ hasRoom ? '已检索' : '未创建' }}
      </UiBadge>
    </div>

    <dl class="ag:mt-8 ag:space-y-4">
      <div
        class="ag:flex ag:items-center ag:justify-between ag:border-b ag:border-white/10 ag:pb-3 ag:text-xs"
      >
        <dt class="ag:text-ag-muted">播放状态</dt>
        <dd>{{ stateLabel }}</dd>
      </div>
      <div
        class="ag:flex ag:items-center ag:justify-between ag:border-b ag:border-white/10 ag:pb-3 ag:text-xs"
      >
        <dt class="ag:text-ag-muted">在线成员</dt>
        <dd>{{ memberCount }}</dd>
      </div>
      <div class="ag:flex ag:items-center ag:justify-between ag:text-xs">
        <dt class="ag:text-ag-muted">房主</dt>
        <dd>{{ ownerName ?? '—' }}</dd>
      </div>
    </dl>

    <div class="ag:mt-8 ag:flex ag:gap-2">
      <UiButton variant="primary" class="ag:flex-1" :disabled="!hasRoom" @click="emit('copy')">
        复制房间号
      </UiButton>
      <UiButton variant="success" class="ag:flex-1" :disabled="!hasRoom" @click="emit('control')">
        生成遥控链接
      </UiButton>
    </div>
  </UiPanel>
</template>
