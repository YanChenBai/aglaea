import type {
  ClientRole,
  MemberView,
  RoomMemberKind,
  RoomSnapshot,
  SyncSource,
} from '@aglaea/shared';
export interface RoomUserRecord extends MemberView {
  ownerToken?: string;
  controllerToken?: string;
  lastSeenAt: number;
  connected: boolean;
  clockOffsetMs: number;
}

export interface RoomRecord {
  code: string;
  ownerToken: string;
  createdAt: number;
  updatedAt: number;
  round: number;
  users: Map<string, RoomUserRecord>;
  controllerTokens: Map<string, string>;
  hasJoined: boolean;
  playback: {
    position: number;
    duration: number;
    paused: boolean;
    playbackRate: number;
    media: RoomSnapshot['media'];
    updatedAt: number;
    source: SyncSource;
  };
}

export interface ControllerTicket {
  token: string;
  roomCode: string;
  ownerClientId: string;
  targetName: string;
  targetRole: 'owner' | 'member';
  createdAt: number;
  expiresAt: number | null;
}

export interface JoinOptions {
  roomCode: string;
  clientId: string;
  name: string;
  role: ClientRole;
  kind: RoomMemberKind;
  ownerToken?: string;
  controllerToken?: string;
}
