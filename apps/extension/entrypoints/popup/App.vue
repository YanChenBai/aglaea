<script setup vapor lang="ts">
import { UiBadge, UiButton, UiPanel } from '@aglaea/ui';
import { computed, onUnmounted, ref } from 'vue';
import { browser } from 'wxt/browser';

import ActionIcon from '../../src/components/ActionIcon.vue';
import type {
  ExtensionLog,
  ExtensionRequest,
  ExtensionResponse,
  ExtensionState,
  PlayerTab,
} from '../../src/messaging.ts';

const state = ref<ExtensionState>({
  config: { serverUrl: 'http://localhost:8787', name: 'Aglaea' },
  status: 'idle',
  role: 'none',
});

const roomInput = ref('');
const serverInput = ref('http://localhost:8787');
const nameInput = ref('Aglaea');
const busy = ref(false);
const error = ref('');
const copiedUrl = ref('');
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
const copiedRoom = ref('');
const playerTabs = ref<PlayerTab[]>([]);
const selectedTabId = ref<number>();
const boundTab = computed(() => playerTabs.value.find(tab => tab.id === state.value.playerTabId));
const currentTab = computed(() => playerTabs.value.find(tab => tab.active));
const localLogs = ref<ExtensionLog[]>([]);

const logs = computed(() =>
  [...(state.value.logs ?? []), ...localLogs.value].sort((a, b) => b.time - a.time).slice(0, 100),
);

function logLocal(message: string, level: ExtensionLog['level']): void {
  localLogs.value = [
    ...localLogs.value,
    { id: crypto.randomUUID(), time: Date.now(), level, message },
  ].slice(-20);
}

function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString('zh-CN', { hour12: false });
}

const connected = computed(() => state.value.status === 'connected');
const roomCode = computed(() => state.value.config.roomCode ?? '');
const members = computed(() => state.value.snapshot?.members ?? []);
const duration = computed(() => Math.max(0, state.value.snapshot?.playback.duration ?? 0));

const position = computed(() =>
  Math.min(duration.value, Math.max(0, state.value.snapshot?.playback.position ?? 0)),
);

const progress = computed(() => (duration.value > 0 ? (position.value / duration.value) * 100 : 0));
const roleLabels = { owner: '房主', member: '成员', controller: '遥控端' };

function formatPosition(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3_600);
  const minutes = String(Math.floor(total / 60) % 60).padStart(2, '0');
  const rest = String(total % 60).padStart(2, '0');

  return hours > 0 ? `${hours}:${minutes}:${rest}` : `${minutes}:${rest}`;
}

async function request(message: ExtensionRequest): Promise<void> {
  busy.value = true;
  error.value = '';

  const response = (await browser.runtime.sendMessage(message).catch((cause: unknown) => {
    error.value = cause instanceof Error ? cause.message : '扩展通信失败';
    logLocal(error.value, 'error');

    return undefined;
  })) as ExtensionResponse | undefined;

  if (response?.state) {
    state.value = response.state;
    serverInput.value = response.state.config.serverUrl;
    nameInput.value = response.state.config.name;

    if (response.tabs) {
      playerTabs.value = response.tabs;
      selectedTabId.value = response.state.playerTabId;
    }

    if (response.state.lastError) {
      error.value = response.state.lastError;
    }
  }

  busy.value = false;
}

async function saveConfig(): Promise<void> {
  await request({
    type: 'save-config',
    config: {
      serverUrl: serverInput.value.trim() || 'http://localhost:8787',
      name: nameInput.value.trim() || 'Aglaea',
    },
  });
}

async function createRoom(): Promise<void> {
  await saveConfig();
  await request({ type: 'create-room' });
}

async function joinRoom(): Promise<void> {
  if (!roomInput.value.trim()) {
    error.value = '请输入房间号';

    return;
  }

  await saveConfig();
  await request({ type: 'join-room', roomCode: roomInput.value.trim() });
}

async function leaveRoom(): Promise<void> {
  await request({ type: 'leave-room' });
}

async function onPlayerTabChange(event: Event): Promise<void> {
  selectedTabId.value = Number((event.target as HTMLSelectElement).value) || undefined;

  if (selectedTabId.value === undefined) {
    return;
  }

  await request({ type: 'bind-player-tab', tabId: selectedTabId.value });
}

async function openRoomVideo(): Promise<void> {
  await request({ type: 'open-room-video' });

  if (!error.value) {
    await request({ type: 'get-state' });
  }
}

async function createControlLink(): Promise<void> {
  copiedUrl.value = '';
  await request({ type: 'create-control-link' });

  if (error.value || !state.value.controlUrl) {
    return;
  }

  busy.value = true;
  const url = state.value.controlUrl;

  try {
    await navigator.clipboard.writeText(url);
    copiedUrl.value = url;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copiedUrl.value = '';
    }, 2_000);
    logLocal('遥控链接已复制', 'success');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '复制失败，请重试';
    logLocal(error.value, 'error');
  } finally {
    busy.value = false;
  }
}

async function copyRoomCode(): Promise<void> {
  try {
    await navigator.clipboard.writeText(roomCode.value);
    copiedRoom.value = roomCode.value;
    logLocal('房间号已复制', 'success');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '复制失败，请手动复制房间号';
    logLocal(error.value, 'error');
  }
}

const onMessage = (raw: unknown): void => {
  const message = raw as { type?: string; state?: ExtensionState };

  if (message.type === 'aglaea:state' && message.state) {
    state.value = message.state;
  }
};

browser.runtime.onMessage.addListener(onMessage);
onUnmounted(() => browser.runtime.onMessage.removeListener(onMessage));
onUnmounted(() => clearTimeout(copiedTimer));
void request({ type: 'get-state' });
</script>

<template>
  <main class="ag:box-border ag:min-h-[520px] ag:bg-ag-ink ag:p-4 ag:text-ag-paper">
    <header class="ag:mb-4 ag:flex ag:items-center ag:justify-between">
      <div class="ag:flex ag:items-center ag:gap-3">
        <img
          :src="'/icons/aglaea-head-128.png'"
          alt=""
          width="40"
          height="40"
          class="ag:shrink-0"
        />
        <h1 class="ag:font-serif ag:text-2xl ag:text-ag-gold">Aglaea</h1>
      </div>
      <UiBadge :tone="state.status === 'error' ? 'danger' : connected ? 'success' : 'warning'">
        {{
          connected
            ? '已连接'
            : state.status === 'connecting'
              ? '连接中'
              : state.status === 'error'
                ? '异常'
                : '未连接'
        }}
      </UiBadge>
    </header>

    <p
      v-if="error"
      class="ag:mb-3 ag:rounded-lg ag:border ag:border-[#e07a5f]/60 ag:bg-[#e07a5f]/10 ag:p-2 ag:text-xs ag:text-[#f0b8a8]"
    >
      {{ error }}
    </p>

    <section class="ag:space-y-3">
      <div class="ag:text-xs ag:text-ag-muted">
        <label for="popup-server">服务器</label>
        <input
          id="popup-server"
          v-model="serverInput"
          class="ag-ui-input ag-ui-input--md ag:mt-2"
          placeholder="http://localhost:8787"
        />
      </div>
      <div class="ag:text-xs ag:text-ag-muted">
        <label for="popup-name">显示名称</label>
        <input
          id="popup-name"
          :value="roomCode ? state.config.name : nameInput"
          class="ag-ui-input ag-ui-input--md ag:mt-2"
          placeholder="Aglaea"
          :disabled="Boolean(roomCode) || busy"
          @input="nameInput = ($event.target as HTMLInputElement).value"
        />
        <span v-if="roomCode" class="ag:mt-1 ag:block ag:text-[10px]">退出房间后可修改名称</span>
      </div>
    </section>

    <UiPanel as="section" class="ag:mt-4 ag:p-4" aria-label="绑定播放页面">
      <div class="ag:flex ag:items-center ag:justify-between">
        <h2 class="ag:text-xs ag:text-ag-muted">播放页面</h2>
        <UiButton
          variant="ghost"
          icon
          aria-label="刷新播放页面列表"
          title="刷新列表"
          :disabled="busy"
          @click="request({ type: 'get-state' })"
        >
          <ActionIcon name="sync" />
        </UiButton>
      </div>
      <p
        v-if="currentTab"
        class="ag:mt-2 ag:truncate ag:text-[11px] ag:text-ag-jade"
        :title="currentTab.title"
      >
        当前播放页：{{ currentTab.title }}
      </p>
      <div class="ag:mt-2 ag:flex ag:gap-2">
        <select
          :value="selectedTabId ?? ''"
          aria-label="选择播放标签页"
          class="ag-ui-input ag-ui-input--md ag:flex-1"
          :disabled="busy"
          @change="onPlayerTabChange"
        >
          <option value="">选择播放标签页</option>
          <option v-for="tab in playerTabs" :key="tab.id" :value="tab.id">
            {{ tab.active ? '当前页 · ' : '' }}{{ tab.title }}
          </option>
        </select>
      </div>
      <p class="ag:mt-2 ag:truncate ag:text-[10px] ag:text-ag-muted" :title="boundTab?.title">
        {{
          boundTab
            ? `已绑定：${boundTab.title}`
            : state.playerTabId
              ? '绑定页已关闭或不在播放页面，请重新选择'
              : '未绑定，仅同步所选的播放标签页'
        }}
      </p>
      <UiButton
        v-if="state.role === 'member'"
        class="ag:mt-3 ag:w-full"
        :disabled="busy || !state.snapshot?.media.url"
        @click="openRoomVideo"
      >
        <ActionIcon name="join" />打开视频
      </UiButton>
    </UiPanel>

    <section v-if="!roomCode" class="ag:mt-4 ag:space-y-3">
      <UiPanel class="ag:p-4">
        <h2 class="ag:text-sm ag:font-medium ag:text-ag-gold">创建新房间</h2>
        <p class="ag:mt-1 ag:text-[11px] ag:text-ag-muted">成为房主，邀请朋友一起观看</p>
        <UiButton variant="primary" class="ag:mt-3 ag:w-full" :disabled="busy" @click="createRoom">
          <ActionIcon name="plus" /> 创建房间
        </UiButton>
      </UiPanel>
      <UiPanel class="ag:p-4">
        <h2 class="ag:text-sm ag:font-medium ag:text-ag-jade">加入已有房间</h2>
        <p class="ag:mt-1 ag:text-[11px] ag:text-ag-muted">输入朋友分享的 6 位房间号</p>
        <div class="ag:mt-3 ag:flex ag:items-center ag:gap-2">
          <input
            v-model="roomInput"
            :disabled="busy"
            class="ag-ui-input ag-ui-input--md ag:flex-1 ag:font-mono ag:uppercase ag:tracking-[0.18em]"
            placeholder="房间号"
            aria-label="房间号"
            maxlength="6"
            @keydown.enter="!busy && joinRoom()"
          />
          <UiButton variant="success" :disabled="busy" @click="joinRoom">
            <ActionIcon name="join" /> 加入
          </UiButton>
        </div>
      </UiPanel>
    </section>

    <section v-else class="ag:mt-4 ag:space-y-3">
      <UiPanel class="ag:p-4">
        <p class="ag:text-xs ag:text-ag-muted">房间号</p>
        <div class="ag:mt-1 ag:flex ag:items-center ag:justify-between ag:gap-2">
          <p class="ag:font-mono ag:text-2xl ag:tracking-[0.16em] ag:text-ag-gold">
            {{ roomCode }}
          </p>
          <UiButton
            variant="ghost"
            icon
            :disabled="busy"
            :aria-label="copiedRoom === roomCode ? '房间号已复制' : '复制房间号'"
            :title="copiedRoom === roomCode ? '已复制' : '复制房间号'"
            @click="copyRoomCode"
          >
            <ActionIcon :name="copiedRoom === roomCode ? 'check' : 'copy'" />
          </UiButton>
        </div>
        <p class="ag:mt-2 ag:text-[11px] ag:text-ag-muted">
          {{ state.snapshot?.playback.paused ? '暂停中' : '播放中' }} ·
          {{ state.snapshot?.members.length ?? 0 }} 人在线
        </p>
        <div
          class="ag:mt-4 ag:flex ag:items-center ag:justify-between ag:gap-2 ag:font-mono ag:text-[11px] ag:text-ag-muted"
        >
          <span>{{ formatPosition(position) }}</span>
          <span>{{ formatPosition(duration) }}</span>
        </div>
        <progress
          class="ag-ui-progress ag:mt-2"
          aria-label="播放进度"
          :value="progress"
          max="100"
        ></progress>
      </UiPanel>

      <UiPanel as="section" class="ag:p-4" aria-label="房间成员">
        <div class="ag:flex ag:items-center ag:justify-between">
          <h2 class="ag:text-xs ag:font-medium ag:text-ag-muted">房间成员</h2>
          <span class="ag:text-[11px] ag:text-ag-muted">{{ members.length }} 人在线</span>
        </div>
        <p v-if="!members.length" class="ag:mt-2 ag:text-xs ag:text-ag-muted">暂无在线成员</p>
        <ul v-else class="ag-ui-scroll ag:mt-2 ag:max-h-32 ag:space-y-2 ag:overflow-y-auto">
          <li
            v-for="member in members"
            :key="member.clientId"
            class="ag:flex ag:items-center ag:justify-between ag:gap-3 ag:text-xs"
          >
            <span class="ag:min-w-0 ag:truncate ag:text-ag-paper">{{ member.name }}</span>
            <span
              class="ag:shrink-0"
              :class="
                member.role === 'owner'
                  ? 'ag:text-ag-gold'
                  : member.role === 'controller'
                    ? 'ag:text-ag-jade'
                    : 'ag:text-ag-muted'
              "
              >{{ roleLabels[member.role] }}</span
            >
          </li>
        </ul>
      </UiPanel>
      <UiButton
        variant="success"
        class="ag:w-full"
        :disabled="busy || !connected"
        @click="request({ type: 'execute-control', action: { type: 'resync' } })"
      >
        <ActionIcon name="sync" />
        {{ busy ? '处理中…' : '手动同步' }}
      </UiButton>
      <UiButton
        v-if="state.role === 'owner' || state.role === 'member'"
        class="ag:w-full"
        :disabled="busy"
        @click="createControlLink"
      >
        <ActionIcon :name="copiedUrl ? 'check' : 'phone'" />
        {{ copiedUrl ? '已经复制' : '手机遥控' }}
      </UiButton>
      <UiButton variant="danger" class="ag:w-full" :disabled="busy" @click="leaveRoom">
        <ActionIcon name="leave" /> 退出房间
      </UiButton>
    </section>

    <section class="ag:mt-4 ag:border-t ag:border-white/10 ag:pt-3" aria-label="运行日志">
      <h2 class="ag:mb-2 ag:text-xs ag:font-medium ag:text-ag-muted">运行日志 · 最近 100 条</h2>
      <div
        class="ag-ui-scroll ag:max-h-40 ag:overflow-y-auto ag:rounded-lg ag:border ag:border-white/10 ag:bg-ag-ink-soft ag:p-2 ag:font-mono ag:text-[10px] ag:leading-relaxed"
      >
        <p v-if="!logs.length" class="ag:text-ag-muted">暂无日志</p>
        <ol v-else class="ag:space-y-1">
          <li
            v-for="entry in logs"
            :key="entry.id"
            class="ag:break-words"
            :class="
              entry.level === 'error'
                ? 'ag:text-[#f0b8a8]'
                : entry.level === 'warning'
                  ? 'ag:text-ag-gold'
                  : entry.level === 'success'
                    ? 'ag:text-ag-jade'
                    : 'ag:text-ag-muted'
            "
          >
            <time :datetime="new Date(entry.time).toISOString()">{{ formatTime(entry.time) }}</time>
            · {{ entry.message }}
          </li>
        </ol>
      </div>
    </section>
  </main>
</template>
