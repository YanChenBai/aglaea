<script setup vapor lang="ts">
import type { RoomSnapshot } from '@aglaea/shared';
import { UiButton, UiInput, UiPanel } from '@aglaea/ui';
import { computed, ref } from 'vue';

import BrandMark from '../components/BrandMark.vue';
import RoomCard from '../components/RoomCard.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { useClipboard } from '../composables/useClipboard.ts';
import { useRoomApi, resolveApiBase } from '../composables/useRoomApi.ts';

const api = useRoomApi();
const clipboard = useClipboard();

const name = ref('Aglaea');
const joinCode = ref('');
const room = ref<RoomSnapshot>();
const ownerToken = ref('');
const controlUrl = ref('');
const error = ref('');
const notice = ref('');
const busy = ref(false);

const serverLabel = computed(() => resolveApiBase() || location.origin);
const memberCount = computed(() => room.value?.members.length ?? 0);

const initialRoom = new URLSearchParams(location.search).get('room');

if (initialRoom) {
  joinCode.value = initialRoom.toUpperCase();
  void lookupRoom();
}

async function newRoom(): Promise<void> {
  busy.value = true;
  error.value = '';

  try {
    const created = await api.createRoom(name.value.trim() || 'Aglaea');
    room.value = created.snapshot;
    ownerToken.value = created.ownerToken;
    joinCode.value = created.roomCode;
    notice.value = '房间已创建，回到插件配置同名服务器后即可加入。';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '创建房间失败';
  } finally {
    busy.value = false;
  }
}

async function lookupRoom(): Promise<void> {
  if (!joinCode.value.trim()) {
    return;
  }

  busy.value = true;
  error.value = '';

  try {
    const result = await api.getRoom(joinCode.value.trim().toUpperCase());
    room.value = result.snapshot;
    notice.value = `房间 ${result.snapshot.roomCode} 可用。`;
  } catch (cause) {
    room.value = undefined;
    error.value = cause instanceof Error ? cause.message : '房间不存在';
  } finally {
    busy.value = false;
  }
}

async function makeControlUrl(): Promise<void> {
  if (!room.value) {
    return;
  }

  busy.value = true;
  error.value = '';

  try {
    const created = await api.createControllerSession(room.value.roomCode, 'web-owner');
    controlUrl.value = created.controlUrl;
    notice.value = '遥控链接已生成，打开后即可在手机上控制播放。';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '生成遥控链接失败';
  } finally {
    busy.value = false;
  }
}

async function copyRoomCode(): Promise<void> {
  if (room.value && (await clipboard.copy(room.value.roomCode))) {
    notice.value = '房间号已复制。';
  }
}

async function copyControlUrl(): Promise<void> {
  if (await clipboard.copy(controlUrl.value)) {
    notice.value = '遥控链接已复制。';
  }
}
</script>

<template>
  <div class="ag:min-h-svh">
    <header
      class="ag:mx-auto ag:flex ag:max-w-6xl ag:items-center ag:justify-between ag:px-6 ag:py-6"
    >
      <BrandMark />
    </header>

    <main>
      <section class="ag:mx-auto ag:max-w-6xl ag:px-6 ag:pb-16 ag:pt-10">
        <div class="ag:grid ag:items-center ag:gap-12 ag:lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p class="ag:mb-4 ag:text-[11px] ag:uppercase ag:tracking-[0.32em] ag:text-ag-gold">
              Bilibili Watch Party
            </p>
            <h1 class="ag-display ag:text-5xl ag:leading-[1.08] ag:text-ag-paper ag:md:text-6xl">
              把进度交给房间，<br />把注意力留给视频。
            </h1>
            <p class="ag:mt-6 ag:max-w-xl ag:text-sm ag:leading-7 ag:text-ag-muted">
              Aglaea 通过浏览器插件连接 B 站播放器，以房间为单位同步播放、暂停、跳转与切集。
              使用内存暂存房间状态，不引入 Redis，部署成本保持在最低。
            </p>
            <div class="ag:mt-8 ag:flex ag:flex-wrap ag:items-center ag:gap-3">
              <UiButton variant="primary" :disabled="busy" @click="newRoom"> 创建房间 </UiButton>
              <a
                class="ag-focus ag:rounded-lg ag:border ag:border-white/15 ag:px-5 ag:py-3 ag:text-sm ag:text-ag-mist ag:no-underline ag:transition ag:hover:border-ag-jade/60 ag:hover:text-ag-jade"
                href="#join"
              >
                输入房间号
              </a>
            </div>
            <div class="ag:mt-4 ag:flex ag:flex-wrap ag:items-center ag:gap-3">
              <p class="ag:font-mono ag:text-[11px] ag:text-ag-muted">服务器 · {{ serverLabel }}</p>
              <StatusBadge status="idle" idle-text="插件未连接" />
            </div>
          </div>

          <div>
            <RoomCard
              :room-code="room?.roomCode"
              :owner-name="room?.ownerName"
              :member-count="memberCount"
              :paused="room?.playback.paused"
              :has-room="Boolean(room)"
              @copy="copyRoomCode"
              @control="makeControlUrl"
            />
            <button
              v-if="controlUrl"
              class="ag-focus ag:mt-3 ag:w-full ag:overflow-hidden ag:rounded-lg ag:border ag:border-white/10 ag:bg-black/20 ag:p-2 ag:text-left ag:font-mono ag:text-[10px] ag:text-ag-jade"
              @click="copyControlUrl"
            >
              {{ controlUrl }}
            </button>
            <p v-if="ownerToken" class="ag:mt-3 ag:text-[10px] ag:leading-5 ag:text-ag-muted">
              房主令牌已生成。网页仅作预先创建，实际连接由浏览器插件持有。
            </p>
          </div>
        </div>
      </section>

      <section id="join" class="ag:border-y ag:border-white/10 ag:bg-black/20">
        <div class="ag:mx-auto ag:grid ag:max-w-6xl ag:gap-10 ag:px-6 ag:py-14 ag:md:grid-cols-2">
          <div>
            <h2 class="ag-display ag:text-3xl">加入一个房间</h2>
            <p class="ag:mt-4 ag:text-sm ag:leading-7 ag:text-ag-muted">
              输入 6 位房间号。浏览器插件会在你进入 B
              站播放页时自动连接，并在右下角显示进出房间的成员。
            </p>
            <div class="ag:mt-6 ag:flex ag:gap-2">
              <UiInput
                size="md"
                v-model="joinCode"
                class="ag:flex-1 ag:font-mono ag:uppercase ag:tracking-[0.18em]"
                aria-label="房间号"
                maxlength="6"
                placeholder="ABCDEF"
                @keydown.enter="lookupRoom"
              />
              <UiButton variant="success" :disabled="busy" @click="lookupRoom"> 查看 </UiButton>
            </div>
            <p v-if="error" class="ag:mt-3 ag:text-xs ag:text-ag-ember">{{ error }}</p>
            <p v-else-if="notice" class="ag:mt-3 ag:text-xs ag:text-ag-jade">{{ notice }}</p>
          </div>

          <div class="ag:grid ag:gap-3">
            <div class="ag:border-l-2 ag:border-ag-gold/60 ag:bg-ag-ink-soft/60 ag:px-5 ag:py-4">
              <p class="ag:text-sm">定时检查播放进度</p>
              <p class="ag:mt-1 ag:text-xs ag:text-ag-muted">
                每 5 秒对齐一次，超过 1.25 秒偏差才触发跳转。
              </p>
            </div>
            <div class="ag:border-l-2 ag:border-ag-jade/60 ag:bg-ag-ink-soft/60 ag:px-5 ag:py-4">
              <p class="ag:text-sm">播放、暂停、切集、全屏</p>
              <p class="ag:mt-1 ag:text-xs ag:text-ag-muted">
                控制动作只在房主端执行，遥控页可以调整音量与进度。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="ag:mx-auto ag:max-w-6xl ag:px-6 ag:py-16">
        <p class="ag:text-[11px] ag:uppercase ag:tracking-[0.28em] ag:text-ag-gold">Structure</p>
        <h2 class="ag-display ag:mt-3 ag:text-3xl">工程结构</h2>
        <div class="ag:mt-6 ag:grid ag:gap-3 ag:md:grid-cols-3">
          <UiPanel as="article" class="ag:p-5">
            <p class="ag:font-mono ag:text-xs ag:text-ag-gold">src/pages</p>
            <p class="ag:mt-2 ag:text-xs ag:leading-6 ag:text-ag-muted">
              页面只负责编排与表单状态，不直接实现连接细节。
            </p>
          </UiPanel>
          <UiPanel as="article" class="ag:p-5">
            <p class="ag:font-mono ag:text-xs ag:text-ag-gold">src/components</p>
            <p class="ag:mt-2 ag:text-xs ag:leading-6 ag:text-ag-muted">
              房间卡片、成员列表、播放控制与状态标记全部拆分为独立组件。
            </p>
          </UiPanel>
          <UiPanel as="article" class="ag:p-5">
            <p class="ag:font-mono ag:text-xs ag:text-ag-gold">src/composables</p>
            <p class="ag:mt-2 ag:text-xs ag:leading-6 ag:text-ag-muted">
              `useRoomSocket` 承载 WebSocket 状态机，`useRoomApi` 封装 REST。
            </p>
          </UiPanel>
        </div>
      </section>
    </main>

    <footer class="ag:border-t ag:border-white/10">
      <div
        class="ag:mx-auto ag:flex ag:max-w-6xl ag:flex-wrap ag:items-center ag:justify-between ag:gap-4 ag:px-6 ag:py-8 ag:text-xs ag:text-ag-muted"
      >
        <span>Aglaea · 内存房间同步</span>
        <span>Bun · Elysia · Vue Vapor · WXT</span>
      </div>
    </footer>
  </div>
</template>
