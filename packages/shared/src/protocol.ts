import { z } from 'zod';

export const PROTOCOL_VERSION = 1;
export const DEFAULT_SERVER_PORT = 8787;
export const DEFAULT_WEBSITE_PORT = 5173;

export const DEFAULT_SYNC_INTERVAL_MS = 1_000;
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;
export const DEFAULT_HEARTBEAT_TIMEOUT_MS = 90_000;
export const DEFAULT_ROOM_TTL_MS = 12 * 60 * 60 * 1_000;
export const SYNC_DRIFT_TOLERANCE_SECONDS = 1.25;

export type ClientRole = 'owner' | 'member' | 'controller';
export type RoomMemberKind = 'browser' | 'remote';

export interface MemberView {
  clientId: string;
  name: string;
  role: ClientRole;
  kind: RoomMemberKind;
  joinedAt: number;
  remoteTarget?: { clientId: string; name: string; role: 'owner' | 'member' };
}

export interface RoomMedia {
  platform: 'bilibili' | 'unknown';
  bvid?: string;
  cid?: number;
  episodeIndex?: number;
  episodeTitle?: string;
  title?: string;
  url?: string;
}

export interface PlaybackState {
  position: number;
  duration: number;
  paused: boolean;
  playbackRate: number;
  updatedAt: number;
  serverClock: number;
}

export interface RoomSnapshot {
  roomCode: string;
  round: number;
  ownerName?: string;
  media: RoomMedia;
  playback: PlaybackState;
  members: MemberView[];
  updatedAt: number;
}

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NP-Z2-9]{6}$/, 'Room code must be six characters');

export const clientMessageIdSchema = z.string().trim().min(1).max(80);
export const displayNameSchema = z.string().trim().min(1).max(24);

export const syncSourceSchema = z.enum([
  'tick',
  'play',
  'pause',
  'seek',
  'ratechange',
  'episode',
  'manual',
  'join',
]);

export const mediaSchema = z.object({
  platform: z.enum(['bilibili', 'unknown']).default('unknown'),
  bvid: z.string().optional(),
  cid: z.number().int().positive().optional(),
  episodeIndex: z.number().int().min(0).optional(),
  episodeTitle: z.string().max(200).optional(),
  title: z.string().max(300).optional(),
  url: z.string().max(2_000).optional(),
});

export const playbackPayloadSchema = z.object({
  position: z.number().finite().min(0),
  duration: z.number().finite().min(0),
  paused: z.boolean(),
  playbackRate: z.number().finite().min(0.25).max(4).default(1),
  media: mediaSchema.optional(),
});

export const controlActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('play') }),
  z.object({ type: z.literal('pause') }),
  z.object({ type: z.literal('toggle') }),
  z.object({ type: z.literal('seek'), position: z.number().finite().min(0) }),
  z.object({ type: z.literal('skip'), delta: z.number().finite().min(-600).max(600) }),
  z.object({ type: z.literal('next') }),
  z.object({ type: z.literal('prev') }),
  z.object({ type: z.literal('fullscreen'), enabled: z.boolean().optional() }),
  z.object({ type: z.literal('volume'), volume: z.number().min(0).max(1) }),
  z.object({ type: z.literal('rate'), playbackRate: z.number().min(0.25).max(4) }),
  z.object({ type: z.literal('resync') }),
]);

export type ControlAction = z.infer<typeof controlActionSchema>;
export type PlaybackPayload = z.infer<typeof playbackPayloadSchema>;
export type MediaDescriptor = z.infer<typeof mediaSchema>;
export type SyncSource = z.infer<typeof syncSourceSchema>;

const helloPayloadSchema = z.object({
  protocolVersion: z.number().int().positive(),
  roomCode: roomCodeSchema,
  clientId: clientMessageIdSchema,
  name: displayNameSchema,
  role: z.enum(['owner', 'member', 'controller']),
  kind: z.enum(['browser', 'remote']).default('browser'),
  ownerToken: z.string().optional(),
  controllerToken: z.string().optional(),
  snapshot: playbackPayloadSchema.partial().optional(),
});

const syncPayloadSchema = playbackPayloadSchema.extend({
  source: syncSourceSchema.default('tick'),
});

const pingPayloadSchema = z.object({ clientTime: z.number().finite() });

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), payload: helloPayloadSchema }),
  z.object({
    type: z.literal('sync'),
    payload: syncPayloadSchema,
  }),
  z.object({ type: z.literal('control'), payload: z.object({ action: controlActionSchema }) }),
  z.object({ type: z.literal('ping'), payload: pingPayloadSchema }),
  z.object({ type: z.literal('leave'), payload: z.object({}).default({}) }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ClientMessageInput = z.input<typeof clientMessageSchema>;

export type ServerMessage =
  | {
      type: 'hello';
      payload: {
        protocolVersion: number;
        snapshot: RoomSnapshot;
        you: MemberView;
        connectionToken: string;
      };
    }
  | { type: 'snapshot'; payload: RoomSnapshot }
  | { type: 'sync'; payload: RoomSnapshot & { source: SyncSource; originClientId: string } }
  | {
      type: 'control';
      payload: {
        action: ControlAction;
        originClientId: string;
        targetClientId?: string;
        serverClock: number;
      };
    }
  | { type: 'member-joined'; payload: { member: MemberView; snapshot: RoomSnapshot } }
  | { type: 'member-left'; payload: { member: MemberView; snapshot: RoomSnapshot } }
  | { type: 'pong'; payload: { clientTime: number; serverTime: number; roomRound: number } }
  | { type: 'error'; payload: { code: string; message: string } };

export interface CreateRoomResponse {
  roomCode: string;
  ownerToken: string;
  snapshot: RoomSnapshot;
}

export interface RoomInfoResponse {
  snapshot: RoomSnapshot;
}

export interface ControllerSessionResponse {
  controllerToken: string;
  controlUrl: string;
  roomCode: string;
  expiresAt: number | null;
}
