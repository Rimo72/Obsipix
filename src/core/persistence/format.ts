import { EditorError } from '@core/errors/EditorError';

/** `OBSIPIX\0` — the first 8 bytes of every `.obsipix` file. */
export const OBSIPIX_MAGIC: readonly number[] = [0x4f, 0x42, 0x53, 0x49, 0x50, 0x49, 0x58, 0x00];

/** Current physical format version. Bumping this requires a migration path. */
export const OBSIPIX_FORMAT_VERSION = 1;

export const OBSIPIX_APPLICATION = 'Obsipix';

/**
 * Physical layout (all integers little-endian):
 *
 * ```
 *  0   8  magic "OBSIPIX\0"
 *  8   2  format version (u16)
 * 10   2  reserved (u16, 0)
 * 12   4  metadata length N (u32)
 * 16   N  metadata JSON (UTF-8) — {@link ObsipixMetadata}
 * ..   4  pixel-section length M (u32)
 * ..   M  concatenated RLE buffer blobs (metadata `buffers[i].offset/length` index in)
 * ..   4  CRC-32 of every byte before this field (u32)
 * ```
 *
 * The file is strictly data — it never contains code (PROJECT_CORE §13.13).
 */

export interface ObsipixBufferRef {
  readonly encoding: 'rle-rgba8';
  readonly width: number;
  readonly height: number;
  /** Byte offset within the pixel section. */
  readonly offset: number;
  readonly length: number;
}

export type ObsipixCelData =
  | { readonly type: 'normal'; readonly buffer: number }
  | { readonly type: 'linked'; readonly buffer: number }
  | { readonly type: 'empty' }
  | { readonly type: 'hold' };

export interface ObsipixFrameData {
  readonly id: string;
  readonly durationMs: number;
  readonly cels: Readonly<Record<string, ObsipixCelData>>;
}

export interface ObsipixLayerData {
  readonly id: string;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly opacity: number;
}

export interface ObsipixTagData {
  readonly id: string;
  readonly name: string;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly direction: 'forward' | 'reverse' | 'ping-pong';
  readonly color?: readonly [number, number, number, number];
  readonly fps?: number;
}

export interface ObsipixPaletteData {
  readonly id: string;
  readonly name: string;
  readonly colors: readonly {
    readonly rgba: readonly [number, number, number, number];
    readonly name?: string;
  }[];
}

export interface ObsipixMetadata {
  readonly format: { readonly version: number; readonly application: string };
  readonly project: { readonly name: string };
  readonly document: {
    readonly width: number;
    readonly height: number;
    readonly colorMode: 'rgba';
    readonly pixelAspect: number;
  };
  readonly layers: readonly ObsipixLayerData[];
  readonly activeLayerId: string;
  readonly buffers: readonly ObsipixBufferRef[];
  readonly animation: {
    readonly frames: readonly ObsipixFrameData[];
    readonly activeFrameId: string;
    readonly tags: readonly ObsipixTagData[];
    /** Reserved for Phase 10 playback / onion-skin settings. */
    readonly playback: Readonly<Record<string, unknown>>;
    readonly onionSkin: Readonly<Record<string, unknown>>;
  };
  readonly palettes: readonly ObsipixPaletteData[];
}

/** Errors thrown while reading a `.obsipix` file, all with `persistence/*` codes. */
export class ObsipixParseError extends EditorError {
  constructor(message: string, cause?: unknown) {
    super('persistence/invalid-file', message, { severity: 'error', cause });
    this.name = 'ObsipixParseError';
  }
}
