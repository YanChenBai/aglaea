<script setup vapor lang="ts">
import { UiPanel } from '@aglaea/ui';
import { computed, ref } from 'vue';

import BrandMark from '../components/BrandMark.vue';
import MemberList from '../components/MemberList.vue';
import PlayerControls from '../components/PlayerControls.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { useRoomSocket } from '../composables/useRoomSocket.ts';

const params = new URLSearchParams(location.search);
const roomCode = (params.get('room') ?? '').toUpperCase();
const controllerToken = params.get('token') ?? '';
const serverUrl = (params.get('server') ?? '').replace(/\/$/, '');

const volume = ref(1);
const fullscreen = ref(false);

const socket = useRoomSocket({
  serverUrl: serverUrl || `${location.protocol}//${location.host}`,
  roomCode,
  clientId: crypto.randomUUID(),
  name: '手机遥控',
  role: 'controller',
  kind: 'remote',
  controllerToken,
});

const title = computed(
  () =>
    socket.snapshot.value?.media.episodeTitle ??
    socket.snapshot.value?.media.title ??
    '等待房主播放',
);

const clockWarning = computed(() => Math.abs(socket.clockOffsetMs.value) > 2_000);
const target = computed(() => socket.you.value?.remoteTarget);

socket.connect();
</script>

<template>
  <div class="ag:min-h-svh ag:px-4 ag:py-6">
    <main class="ag:mx-auto ag:max-w-xl">
      <header class="ag:flex ag:items-center ag:justify-between">
        <BrandMark compact />
        <StatusBadge :status="socket.status.value" />
      </header>
      <div
        class="ag:mt-4 ag:flex ag:flex-wrap ag:items-center ag:justify-between ag:gap-2 ag:border-t ag:border-white/10 ag:pt-3"
      >
        <h1 class="ag:font-mono ag:text-sm ag:text-ag-muted">房间 · {{ roomCode || '未加入' }}</h1>
        <p v-if="target" class="ag:text-xs ag:text-ag-jade">
          {{ target.name }} · {{ target.role === 'owner' ? '房主遥控' : '成员遥控' }}
        </p>
      </div>

      <p
        v-if="socket.error.value"
        class="ag:mt-4 ag:rounded-lg ag:border ag:border-ag-ember/60 ag:bg-ag-ember/10 ag:p-3 ag:text-xs ag:text-ag-ember"
      >
        {{ socket.error.value }}
      </p>
      <p
        v-else-if="clockWarning"
        class="ag:mt-4 ag:rounded-lg ag:border ag:border-ag-gold/60 ag:bg-ag-gold/10 ag:p-3 ag:text-xs ag:text-ag-gold"
      >
        与服务器时钟偏差较大，进度估算可能出现偏移。
      </p>

      <UiPanel as="section" v-if="!controllerToken" class="ag:mt-6 ag:p-4">
        <p class="ag:text-sm ag:text-ag-gold">缺少遥控令牌</p>
        <p class="ag:mt-2 ag:text-xs ag:leading-6 ag:text-ag-muted">
          请回到浏览器插件生成遥控链接，或使用域名后的 `remote.html?room=...&token=...` 打开本页。
        </p>
      </UiPanel>

      <template v-else>
        <UiPanel as="section" class="ag:mt-6 ag:p-4">
          <p class="ag:text-[11px] ag:uppercase ag:tracking-[0.2em] ag:text-ag-muted">
            Now Playing
          </p>
          <p class="ag:mt-2 ag:line-clamp-2 ag:text-sm ag:leading-6 ag:text-ag-paper">
            {{ title }}
          </p>
        </UiPanel>

        <div class="ag:mt-4">
          <PlayerControls
            :position="socket.localPosition.value"
            :duration="socket.snapshot.value?.playback.duration ?? 0"
            :paused="socket.paused.value"
            :volume="volume"
            :enabled="socket.canControl.value"
            :personal-enabled="socket.connected.value"
            :hide-playback-controls="target?.role !== 'owner'"
            :fullscreen="fullscreen"
            @volume="
              value => {
                volume = value;
                socket.control({ type: 'volume', volume: value });
              }
            "
            @control="
              action => {
                if (action.type === 'fullscreen') fullscreen = Boolean(action.enabled);
                socket.control(action);
              }
            "
          />
        </div>

        <div class="ag:mt-6">
          <MemberList :members="socket.members.value" />
        </div>
      </template>

      <p class="ag:mt-8 ag:text-center ag:text-[10px] ag:leading-relaxed ag:text-ag-muted">
        {{
          target?.role === 'member'
            ? '成员可手动对齐房主进度，并调整自己播放器的音量和全屏。'
            : '房主可控制房间进度、播放与切集，音量和全屏只影响自己的播放器。'
        }}
        遥控链接在房间有效期间保持可用。
      </p>
    </main>
  </div>
</template>
