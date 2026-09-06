import type { RGBA } from '@core/types/color';
import type { AnimationTagId } from '@core/types/ids';

export type TagDirection = 'forward' | 'reverse' | 'ping-pong';

/**
 * A named span of frames (PROJECT_CORE §9, §3.9). Phase 6 defines the data so
 * it round-trips through `.obsipix`; the timeline UI and playback that use it
 * arrive in Phase 10.
 *
 * `startFrame` / `endFrame` are zero-based frame indices, inclusive.
 */
export interface AnimationTag {
  readonly id: AnimationTagId;
  name: string;
  startFrame: number;
  endFrame: number;
  direction: TagDirection;
  color?: RGBA;
  fps?: number;
}
