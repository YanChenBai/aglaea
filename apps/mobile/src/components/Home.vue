<script setup lang="ts">
import { projectPlayback, SYNC_DRIFT_TOLERANCE_SECONDS, type RoomSnapshot } from '@aglaea/shared';
import {
  AWebView,
  type LoadFinishedEventData,
  type ShouldOverrideUrlLoadEventData,
} from '@nativescript-community/ui-webview';
import {
  Application,
  ApplicationSettings,
  Screen,
  type EventData,
  type TouchGestureEventData,
  type AndroidActivityBackPressedEventData,
} from '@nativescript/core';
import { $showModal, computed, onUnmounted, ref, shallowRef, watch } from 'nativescript-vue';

import { fullscreenScript, playerScript } from '../player/browser';
import { createImmersiveScreen } from '../player/fullscreen';
import { isBilibiliUrl, playbackUrl } from '../player/navigation';
import { DEFAULT_PAGE_ZOOM, desktopUserAgent } from '../player/webview';
import type { RoomForm } from '../room/form';
import { RoomSession, type NoticeTone } from '../room/session';
import { makeSocket } from '../room/socket';
import IconButton from './IconButton.vue';
import JoinRoomModal from './JoinRoomModal.vue';
import LogsModal from './LogsModal.vue';
import MembersModal from './MembersModal.vue';

const serverUrl = ref(ApplicationSettings.getString('serverUrl', 'http://10.0.2.2:8787'));
const name = ref(ApplicationSettings.getString('name', '手机观众'));
const roomCode = ref(ApplicationSettings.getString('roomCode', ''));
const status = ref('输入房间码加入电脑房主的房间');
const playerStatus = ref('等待房主选择视频');
const snapshot = shallowRef<RoomSnapshot>();
const source = ref('');
const joined = ref(false);
const pageZoom = ref(DEFAULT_PAGE_ZOOM);
const fullscreen = ref(false);
const overlayVisible = ref(false);
let overlayTimer: ReturnType<typeof setTimeout> | undefined;
const connected = ref(false);
const playerReady = ref(false);
const notices = ref<{ id: number; message: string; tone: NoticeTone }[]>([]);
const noticeTimers = new Map<number, ReturnType<typeof setTimeout>>();
let noticeId = 0;

const overlayStatus = computed(() => {
  let label = '连接中';

  if (connected.value) {
    label = playerReady.value ? '已连接播放器' : '等待播放器';
  }

  return `${label} · ${snapshot.value?.roomCode ?? roomCode.value.toUpperCase()}`;
});

const immersiveScreen = createImmersiveScreen();
let changingFullscreen = false;

const desktopUa = desktopUserAgent(
  android.webkit.WebSettings.getDefaultUserAgent(Application.android.context),
);

const logs = ref<string[]>([]);
let modalOpen = false;

const basicStatus = computed(() => {
  if (!joined.value) {
    return '未加入房间';
  }

  if (!connected.value) {
    return status.value;
  }

  return `${snapshot.value?.roomCode ?? roomCode.value} · ${playerReady.value ? '播放器已就绪' : '等待播放器'}`;
});

const statusColor = computed(() => {
  if (!joined.value) {
    return '#8fa3a7';
  }

  if (!connected.value) {
    return snapshot.value ? '#e07a5f' : '#d8b46a';
  }

  return playerReady.value ? '#69cdad' : '#d8b46a';
});

let session: RoomSession | undefined;
let webview: AWebView | undefined;
let bridgeReady = false;
let currentMedia: string | undefined;
let forceSeek = true;
let pageGeneration = 0;
let desktopRedirectTarget: string | undefined;

function log(message: string): void {
  logs.value = [...logs.value.slice(-199), `${new Date().toTimeString().slice(0, 8)}  ${message}`];
}

watch(fullscreen, enabled => {
  webview?.android?.setPlayerCornerRadius(enabled ? 0 : 12 * Screen.mainScreen.scale);
});

async function openJoinRoom(): Promise<void> {
  if (modalOpen) {
    return;
  }

  modalOpen = true;

  try {
    const value = await $showModal<RoomForm>(JoinRoomModal, {
      props: {
        initial: { serverUrl: serverUrl.value, name: name.value, roomCode: roomCode.value },
      },
      fullscreen: false,
    });

    if (value) {
      join(value);
    }
  } finally {
    modalOpen = false;
  }
}

async function openLogs(): Promise<void> {
  if (modalOpen) {
    return;
  }

  modalOpen = true;

  try {
    await $showModal(LogsModal, { props: { getLogs: () => logs.value }, fullscreen: false });
  } finally {
    modalOpen = false;
  }
}

async function openMembers(): Promise<void> {
  if (modalOpen) {
    return;
  }

  modalOpen = true;

  try {
    await $showModal(MembersModal, {
      props: { getSnapshot: () => snapshot.value },
      fullscreen: false,
    });
  } finally {
    modalOpen = false;
  }
}

function notify(message: string, tone: NoticeTone = 'info'): void {
  log(message);
  const id = ++noticeId;
  const removed = notices.value.length >= 3 ? notices.value[0] : undefined;

  if (removed) {
    clearTimeout(noticeTimers.get(removed.id));
    noticeTimers.delete(removed.id);
  }

  notices.value = [...notices.value.slice(-2), { id, message, tone }];
  noticeTimers.set(
    id,
    setTimeout(() => {
      notices.value = notices.value.filter(item => item.id !== id);
      noticeTimers.delete(id);
    }, 4_200),
  );
}

function follow(): void {
  if (!bridgeReady || !snapshot.value || !session || !webview) {
    return;
  }

  const playback = snapshot.value.playback;
  dev.aglaea.mobile.PlaybackService.updatePlayback(!playback.paused);
  const sentAt = Date.now();
  const position = projectPlayback(playback, sentAt + session.clockOffsetMs - playback.updatedAt);
  dev.aglaea.mobile.PlaybackService.updateMedia(
    snapshot.value.media.title || snapshot.value.media.episodeTitle || 'Aglaea 房间播放',
    Math.round(position * 1_000),
    Math.round(playback.duration * 1_000),
    playback.playbackRate,
  );
  webview.emitToWebView('aglaeaFollow', {
    ...playback,
    position,
    sentAt,
    tolerance: SYNC_DRIFT_TOLERANCE_SECONDS,
    force: forceSeek,
  });
  forceSeek = false;
}

function receive(next: RoomSnapshot): void {
  snapshot.value = next;
  const url = playbackUrl(next.media.url);

  if (url && url !== currentMedia) {
    currentMedia = url;
    desktopRedirectTarget = undefined;
    forceSeek = true;
    log('正在打开房主的视频');

    if (source.value === url) {
      void inject();

      return;
    }

    source.value = url;
    bridgeReady = false;

    return;
  }

  follow();
}

function leave(): void {
  hidePlayerOverlay();

  for (const timer of noticeTimers.values()) {
    clearTimeout(timer);
  }

  noticeTimers.clear();
  notices.value = [];
  connected.value = false;
  playerReady.value = false;
  immersiveScreen(false);
  fullscreen.value = false;
  dev.aglaea.mobile.PlaybackService.disconnect(Application.android.context);
  pageGeneration++;
  session?.disconnect();
  session = undefined;
  joined.value = false;
  snapshot.value = undefined;
  currentMedia = undefined;

  if (bridgeReady) {
    void webview?.executeJavaScript('window.aglaeaDispose?.();');
  }

  bridgeReady = false;
  status.value = '已退出房间';
}

function join(value: RoomForm): void {
  leave();
  serverUrl.value = value.serverUrl;
  name.value = value.name;
  roomCode.value = value.roomCode;
  const base = value.serverUrl;

  ApplicationSettings.setString('serverUrl', base);
  ApplicationSettings.setString('name', name.value.trim());
  ApplicationSettings.setString('roomCode', value.roomCode);
  log(`连接房间 ${value.roomCode} · ${base}`);

  const clientId = ApplicationSettings.getString(
    'clientId',
    `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  ApplicationSettings.setString('clientId', clientId);
  session = new RoomSession(
    { serverUrl: base, roomCode: value.roomCode, name: value.name, clientId },
    makeSocket,
    receive,
    message => {
      status.value = message;
      connected.value = session?.connected ?? false;
      log(message);
      showPlayerOverlay();
    },
    notify,
  );
  joined.value = true;

  if (webview) {
    dev.aglaea.mobile.PlaybackService.connect(Application.android.context, webview.android);
  }

  session.connect();

  // 同一页重新加入也要恢复桥接。
  if (webview && isBilibiliUrl(source.value)) {
    void inject();
  }
}

async function inject(): Promise<void> {
  if (!webview || !joined.value) {
    return;
  }

  const generation = pageGeneration;

  try {
    await webview.executeJavaScript(playerScript());

    if (generation !== pageGeneration || !joined.value) {
      return;
    }

    bridgeReady = true;
    forceSeek = true;
    follow();
  } catch {
    playerStatus.value = '播放器桥接失败，可尝试重新加载';
    notify(playerStatus.value, 'error');
  }
}

function loaded(event: EventData): void {
  webview = event.object as AWebView;
  webview.autoInjectJSBridge = true;
  webview.android.setPlayerCornerRadius(fullscreen.value ? 0 : 12 * Screen.mainScreen.scale);
  const settings = webview.android.getSettings();
  settings.setUserAgentString(desktopUa);
  settings.setUseWideViewPort(true);
  settings.setLoadWithOverviewMode(false);
  // 原生缩放百分比包含屏幕密度，让页面在不同 DPI 上具有一致大小。
  webview.android.setInitialScale(Math.round(pageZoom.value * Screen.mainScreen.scale));

  // 先配置 UA 与缩放，再发起首页请求，避免首次请求落到移动页。
  if (!source.value) {
    source.value = 'https://www.bilibili.com';
  }
}

function zoom(delta: number): void {
  const next = Math.max(50, Math.min(200, pageZoom.value + delta));
  webview?.android?.zoomBy(next / pageZoom.value);
  pageZoom.value = next;
  webview?.android?.setInitialScale(Math.round(next * Screen.mainScreen.scale));
}

function pageStarted(): void {
  hidePlayerOverlay();
  playerReady.value = false;
  immersiveScreen(false);
  fullscreen.value = false;
  pageGeneration++;
  bridgeReady = false;
}

function pageLoaded(event: LoadFinishedEventData): void {
  if (event.error) {
    // 插件也会上报图片、统计脚本等子资源错误，不能覆盖播放器的实际状态。
    if (event.url && event.url !== webview?.android?.getUrl()) {
      return;
    }

    playerStatus.value = '页面加载失败';
    notify(playerStatus.value, 'error');

    return;
  }

  if (event.url && redirectToDesktop(event.url)) {
    return;
  }

  if (event.url && isBilibiliUrl(event.url)) {
    log('已加载桌面页面');
    void inject();
  }
}

function redirectToDesktop(url: string): boolean {
  const target = playbackUrl(url);

  if (!target || target === url) {
    return false;
  }

  if (desktopRedirectTarget === target) {
    playerStatus.value = '站点重复跳转到移动页，请重新加载或检查页面';

    return true;
  }

  desktopRedirectTarget = target;
  log('拦截移动页跳转，正在打开桌面页面');
  void webview?.loadUrl(target).catch(() => {
    playerStatus.value = '桌面页面加载失败';
  });

  return true;
}

function navigation(event: ShouldOverrideUrlLoadEventData): void {
  // 页面只允许在 B 站 HTTPS 域内导航，阻止唤起外部 App。
  if (!isBilibiliUrl(event.url)) {
    event.cancel = true;

    return;
  }

  event.cancel = redirectToDesktop(event.url);
}

function playerMessage(event: { data: { message: string } }): void {
  if (
    event.data.message !== playerStatus.value &&
    /^(播放受限|音频焦点不可用)/.test(event.data.message)
  ) {
    notify(event.data.message, 'warning');
  }

  playerStatus.value = event.data.message;
  log(event.data.message);
}

function playerChanged(event: { data: { ready: boolean } }): void {
  playerReady.value = event.data.ready;
  showPlayerOverlay();
}

function manualSync(): void {
  if (!connected.value || !playerReady.value) {
    return;
  }

  resync();
  showPlayerOverlay();
  notify('已请求同步房间进度', 'success');
}

function resync(): void {
  dev.aglaea.mobile.PlaybackService.retryFocus();
  forceSeek = true;
  follow();
  session?.requestSync();
}

function resume(): void {
  if (joined.value) {
    session?.connect();
    resync();
  }
}

async function toggleFullscreen(): Promise<void> {
  if (!webview || changingFullscreen) {
    return;
  }

  changingFullscreen = true;
  const next = !fullscreen.value;
  const generation = pageGeneration;

  try {
    await webview.executeJavaScript<boolean>(fullscreenScript(next));

    if (generation !== pageGeneration) {
      return;
    }

    fullscreen.value = next;
    immersiveScreen(next);

    showPlayerOverlay();
  } catch {
    if (!next) {
      hidePlayerOverlay();
      fullscreen.value = false;
      immersiveScreen(false);
    }

    playerStatus.value = '切换网页全屏失败，请等待 B 站播放器加载';
    notify(playerStatus.value, 'error');
  } finally {
    changingFullscreen = false;
  }
}

function hidePlayerOverlay(): void {
  clearTimeout(overlayTimer);
  overlayTimer = undefined;
  overlayVisible.value = false;
}

function showPlayerOverlay(): void {
  if (!joined.value) {
    return;
  }

  clearTimeout(overlayTimer);
  overlayVisible.value = true;
  overlayTimer = setTimeout(hidePlayerOverlay, 2_500);
}

function playerTouched(event: TouchGestureEventData): void {
  if (event.action === 'down') {
    showPlayerOverlay();
  }
}

function backPressed(event: AndroidActivityBackPressedEventData): void {
  if (fullscreen.value) {
    event.cancel = true;
    void toggleFullscreen();
  }
}

Application.on(Application.resumeEvent, resume);
Application.android.on('activityBackPressed', backPressed);
onUnmounted(() => {
  Application.off(Application.resumeEvent, resume);
  Application.android.off('activityBackPressed', backPressed);
  leave();
});
</script>

<template>
  <Frame>
    <Page actionBarHidden="true">
      <GridLayout rows="auto, *, auto">
        <GridLayout
          rows="auto"
          columns="auto, *"
          class="mobile-status"
          :visibility="fullscreen ? 'collapse' : 'visible'"
        >
          <Label
            col="0"
            class="status-dot"
            :backgroundColor="statusColor"
            verticalAlignment="center"
          />
          <Label
            col="1"
            :text="basicStatus"
            class="caption"
            textWrap="false"
            verticalAlignment="center"
          />
        </GridLayout>
        <GridLayout
          :row="fullscreen ? 0 : 1"
          :rowSpan="fullscreen ? 3 : 1"
          :margin="fullscreen ? 0 : 12"
          class="player-surface"
        >
          <AWebView
            :src="source"
            :userAgent="desktopUa"
            :viewPortSize="{
              initialScale: pageZoom / 100,
              userScalable: true,
              minimumScale: 0.5,
              maximumScale: 2,
            }"
            :domStorage="true"
            :supportZoom="true"
            :builtInZoomControls="true"
            :displayZoomControls="false"
            :mediaPlaybackRequiresUserAction="false"
            @loaded="loaded"
            @loadStarted="pageStarted"
            @loadFinished="pageLoaded"
            @shouldOverrideUrlLoading="navigation"
            @aglaeaStatus="playerMessage"
            @aglaeaPlayer="playerChanged"
            @touch="playerTouched"
          />
          <StackLayout
            v-if="notices.length || (joined && overlayVisible)"
            class="player-overlay"
            horizontalAlignment="right"
            verticalAlignment="top"
          >
            <GridLayout
              v-if="joined && overlayVisible"
              columns="auto, auto, auto"
              class="player-capsule"
              horizontalAlignment="right"
              verticalAlignment="top"
              @touch="playerTouched"
            >
              <Label
                col="0"
                class="status-dot"
                :backgroundColor="statusColor"
                verticalAlignment="center"
              />
              <Label
                col="1"
                :text="overlayStatus"
                class="capsule-status"
                verticalAlignment="center"
              />
              <GridLayout
                col="2"
                class="capsule-sync"
                accessibilityRole="button"
                accessibilityLabel="手动同步"
                verticalAlignment="center"
                :isEnabled="connected && playerReady"
                :opacity="connected && playerReady ? 0.8 : 0.4"
                @tap="manualSync"
              >
                <Image src="res://player_sync" width="18" height="18" stretch="aspectFit" />
              </GridLayout>
            </GridLayout>
            <Label
              v-for="notice in notices"
              :key="notice.id"
              :text="notice.message"
              :class="['player-notice', `notice-${notice.tone}`]"
              textWrap="true"
              horizontalAlignment="right"
            />
          </StackLayout>
        </GridLayout>
        <StackLayout
          row="2"
          class="mobile-controls"
          :visibility="fullscreen ? 'collapse' : 'visible'"
        >
          <GridLayout columns="88, 32, 44, 32, *, *, *" height="44">
            <GridLayout
              col="0"
              :class="['room-action', joined ? 'room-action-leave' : 'room-action-join']"
              accessibilityRole="button"
              :accessibilityLabel="joined ? '退出房间' : '加入房间'"
              @tap="joined ? leave() : openJoinRoom()"
            >
              <GridLayout
                columns="auto, auto"
                horizontalAlignment="center"
                verticalAlignment="center"
              >
                <Image
                  col="0"
                  :src="joined ? 'res://room_leave' : 'res://room_join'"
                  width="16"
                  height="16"
                  marginRight="4"
                  verticalAlignment="center"
                  stretch="aspectFit"
                />
                <Label
                  col="1"
                  :text="joined ? '退出房间' : '加入房间'"
                  textWrap="false"
                  verticalAlignment="center"
                />
              </GridLayout>
            </GridLayout>
            <IconButton
              col="1"
              icon="player_minus"
              label="缩小网页"
              :disabled="pageZoom <= 50"
              @tap="zoom(-25)"
            />
            <Label col="2" :text="`${pageZoom}%`" class="zoom-value" verticalAlignment="center" />
            <IconButton
              col="3"
              icon="player_plus"
              label="放大网页"
              :disabled="pageZoom >= 200"
              @tap="zoom(25)"
            />
            <IconButton col="4" icon="player_fullscreen" label="全屏" @tap="toggleFullscreen" />
            <IconButton col="5" icon="player_members" label="房间成员" @tap="openMembers" />
            <IconButton col="6" icon="player_logs" label="详细日志" @tap="openLogs" />
          </GridLayout>
        </StackLayout>
      </GridLayout>
    </Page>
  </Frame>
</template>
