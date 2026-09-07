import type { PixelBuffer } from '@core/pixels/PixelBuffer';

import { ByteWriter } from './ByteWriter';

/**
 * A minimal GIF89a encoder — static and animated (PROJECT_CORE §108).
 *
 * Pure and browser-free. GIF is little-endian, which matches {@link ByteWriter}.
 * Colours are quantised to a single global palette of up to 256 entries; when a
 * frame contains more distinct opaque colours than fit, the least-used ones are
 * remapped to their nearest neighbour. One palette slot is reserved for
 * transparency whenever any pixel is not fully opaque.
 */

export interface GifFrame {
  readonly buffer: PixelBuffer;
  /** On-screen time in milliseconds (rounded to GIF's 10ms units). */
  readonly delayMs: number;
}

export interface GifOptions {
  /** 0 = loop forever (default), n = play n extra times, -1 = play once. */
  readonly loop?: number;
}

const MAX_COLORS = 256;
const ALPHA_THRESHOLD = 128; // below this a pixel is treated as transparent

interface Quantised {
  /** RGB triplets, `palette.length / 3` entries; index 0 is transparent when `hasAlpha`. */
  readonly palette: Uint8Array;
  readonly hasAlpha: boolean;
  /** Palette index per pixel, per frame. */
  readonly indexed: Uint8Array[];
  readonly width: number;
  readonly height: number;
}

function keyOf(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

function quantise(frames: readonly GifFrame[]): Quantised {
  const first = frames[0]?.buffer;
  if (!first) {
    throw new RangeError('A GIF needs at least one frame');
  }
  const width = first.width;
  const height = first.height;

  const counts = new Map<number, number>();
  let hasAlpha = false;
  for (const frame of frames) {
    const bytes = frame.buffer.toBytes();
    for (let i = 0; i < bytes.length; i += 4) {
      if ((bytes[i + 3] ?? 0) < ALPHA_THRESHOLD) {
        hasAlpha = true;
        continue;
      }
      const key = keyOf(bytes[i] ?? 0, bytes[i + 1] ?? 0, bytes[i + 2] ?? 0);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const budget = MAX_COLORS - (hasAlpha ? 1 : 0);
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const kept = ordered.slice(0, budget).map(([key]) => key);
  const keptSet = new Set(kept);

  const transparentIndex = hasAlpha ? 0 : -1;
  const paletteKeys = hasAlpha ? [0, ...kept] : [...kept];
  if (paletteKeys.length === 0) {
    paletteKeys.push(0);
  }
  const palette = new Uint8Array(paletteKeys.length * 3);
  paletteKeys.forEach((key, index) => {
    palette[index * 3] = (key >> 16) & 0xff;
    palette[index * 3 + 1] = (key >> 8) & 0xff;
    palette[index * 3 + 2] = key & 0xff;
  });

  const indexFor = new Map<number, number>();
  paletteKeys.forEach((key, index) => {
    if (!(hasAlpha && index === 0)) {
      indexFor.set(key, index);
    }
  });

  const nearest = (r: number, g: number, b: number): number => {
    let best = hasAlpha ? 1 : 0;
    let bestDist = Infinity;
    for (let index = hasAlpha ? 1 : 0; index < paletteKeys.length; index += 1) {
      const dr = r - (palette[index * 3] ?? 0);
      const dg = g - (palette[index * 3 + 1] ?? 0);
      const db = b - (palette[index * 3 + 2] ?? 0);
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    }
    return best;
  };

  const indexed = frames.map((frame) => {
    const bytes = frame.buffer.toBytes();
    const out = new Uint8Array(width * height);
    for (let p = 0; p < out.length; p += 1) {
      const i = p * 4;
      if ((bytes[i + 3] ?? 0) < ALPHA_THRESHOLD) {
        out[p] = transparentIndex >= 0 ? transparentIndex : 0;
        continue;
      }
      const r = bytes[i] ?? 0;
      const g = bytes[i + 1] ?? 0;
      const b = bytes[i + 2] ?? 0;
      const key = keyOf(r, g, b);
      out[p] = keptSet.has(key) ? (indexFor.get(key) ?? 0) : nearest(r, g, b);
    }
    return out;
  });

  return { palette, hasAlpha, indexed, width, height };
}

/** LZW-compress one frame's indices into GIF sub-blocks. */
function lzwCompress(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let dict = new Map<string, number>();
  const resetDict = (): void => {
    dict = new Map();
    for (let i = 0; i < clearCode; i += 1) {
      dict.set(String(i), i);
    }
    codeSize = minCodeSize + 1;
    nextCode = endCode + 1;
  };
  resetDict();

  const out: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;
  const emit = (code: number): void => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      out.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  emit(clearCode);
  let current = String(indices[0] ?? 0);
  for (let i = 1; i < indices.length; i += 1) {
    const next = indices[i] ?? 0;
    const combined = `${current},${String(next)}`;
    if (dict.has(combined)) {
      current = combined;
    } else {
      emit(dict.get(current) ?? 0);
      if (nextCode < 4096) {
        dict.set(combined, nextCode);
        nextCode += 1;
        if (nextCode > 1 << codeSize && codeSize < 12) {
          codeSize += 1;
        }
      } else {
        emit(clearCode);
        resetDict();
      }
      current = String(next);
    }
  }
  emit(dict.get(current) ?? 0);
  emit(endCode);
  if (bitCount > 0) {
    out.push(bitBuffer & 0xff);
  }

  // pack into <=255-byte sub-blocks
  const writer = new ByteWriter(out.length + out.length / 255 + 16);
  for (let i = 0; i < out.length; i += 255) {
    const chunk = out.slice(i, i + 255);
    writer.u8(chunk.length);
    for (const byte of chunk) {
      writer.u8(byte);
    }
  }
  writer.u8(0); // block terminator
  return writer.toUint8Array();
}

/** Smallest power-of-two colour-table size (2..256) that holds `entries`. */
function tableSize(entries: number): number {
  let size = 2;
  while (size < entries) {
    size *= 2;
  }
  return Math.min(256, size);
}

/**
 * Encode one or more RGBA frames as a GIF. A single frame yields a static GIF;
 * multiple frames yield an animation with per-frame delays and a loop control.
 */
export function encodeGif(frames: readonly GifFrame[], options: GifOptions = {}): Uint8Array {
  const { palette, hasAlpha, indexed, width, height } = quantise(frames);
  const paletteEntries = palette.length / 3;
  const gctSize = tableSize(paletteEntries);
  const gctBits = Math.log2(gctSize) - 1;
  const minCodeSize = Math.max(2, Math.ceil(Math.log2(gctSize)));
  const animated = frames.length > 1;

  const w = new ByteWriter(1024 + width * height);
  for (const ch of 'GIF89a') {
    w.u8(ch.charCodeAt(0));
  }
  // Logical Screen Descriptor
  w.u16(width);
  w.u16(height);
  w.u8(0x80 | (0x07 << 4) | gctBits); // global colour table present, 8-bit colour resolution
  w.u8(0); // background colour index
  w.u8(0); // pixel aspect ratio

  // Global Colour Table (padded to gctSize)
  for (let i = 0; i < gctSize; i += 1) {
    w.u8(palette[i * 3] ?? 0);
    w.u8(palette[i * 3 + 1] ?? 0);
    w.u8(palette[i * 3 + 2] ?? 0);
  }

  if (animated) {
    // Netscape 2.0 looping extension
    w.u8(0x21);
    w.u8(0xff);
    w.u8(0x0b);
    for (const ch of 'NETSCAPE2.0') {
      w.u8(ch.charCodeAt(0));
    }
    w.u8(0x03);
    w.u8(0x01);
    const loop = options.loop ?? 0;
    w.u16(loop < 0 ? 1 : loop); // 0 = forever
    w.u8(0);
  }

  frames.forEach((frame, index) => {
    // Graphic Control Extension
    const delayCs = Math.max(0, Math.round(frame.delayMs / 10));
    w.u8(0x21);
    w.u8(0xf9);
    w.u8(0x04);
    w.u8((hasAlpha ? 0x01 : 0x00) | (0x01 << 2)); // transparent flag + "do not dispose"
    w.u16(animated ? delayCs : 0);
    w.u8(0); // transparent colour index (our reserved slot 0)
    w.u8(0); // block terminator

    // Image Descriptor
    w.u8(0x2c);
    w.u16(0);
    w.u16(0);
    w.u16(width);
    w.u16(height);
    w.u8(0); // no local colour table

    w.u8(minCodeSize);
    w.bytes(lzwCompress(indexed[index] ?? new Uint8Array(width * height), minCodeSize));
  });

  w.u8(0x3b); // trailer
  return w.toUint8Array();
}
