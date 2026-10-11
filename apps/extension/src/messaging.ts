import type { ControlAction, MemberView, RoomSnapshot, SyncSource } from '@aglaea/shared';

export interface ExtensionConfig {
  serverUrl: string;
  name: string;
  roomCode?: string;
  ownerToken?: string;
  controllerToken?: string;
}

export interface ExtensionLog {
  id: string;
  time: number;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface ExtensionState {
  config: ExtensionConfig;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  role: 'owner' | 'member' | 'controller' | 'none';
  snapshot?: RoomSnapshot;
  lastError?: string;
  controlUrl?: string;
  logs?: ExtensionLog[];
  clockOffsetMs?: number;
  syncSource?: SyncSource;
  playerTabId?: number;
  isBoundPlayer?: boolean;
}

export interface PlayerTab {
  id: number;
  title: string;
  active: boolean;
}

export interface PlayerSnapshot {
  position: number;
  duration: number;
  paused: boolean;
  playbackRate: number;
  media: {
    platform: 'bilibili';
    bvid?: string;
    cid?: number;
    episodeIndex?: number;
    episodeTitle?: string;
    title?: string;
    url: string;
  };
}

export type ExtensionRequest =
  | { type: 'get-state' }
  | { type: 'bind-player-tab'; tabId: number }
  | { type: 'open-room-video' }
  | { type: 'save-config'; config: Partial<Pick<ExtensionConfig, 'serverUrl' | 'name'>> }
  | { type: 'create-room' }
  | { type: 'join-room'; roomCode: string }
  | { type: 'leave-room' }
  | { type: 'create-control-link' }
  | { type: 'player-snapshot'; snapshot: PlayerSnapshot }
  | {
      type: 'player-event';
      source: 'play' | 'pause' | 'seek' | 'ratechange' | 'episode';
      snapshot: PlayerSnapshot;
    }
  | { type: 'execute-control'; action: ControlAction }
  | { type: 'room-notice'; message: string };

export interface ExtensionResponse {
  state: ExtensionState;
  tabs?: PlayerTab[];
}

export interface RoomNotice {
  message: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

export interface ContentMessage {
  type: 'aglaea:toast' | 'aglaea:execute-control';
  payload?: unknown;
}

export interface MemberNotice {
  member: MemberView;
  snapshot: RoomSnapshot;
}
