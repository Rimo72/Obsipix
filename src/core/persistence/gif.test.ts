import { describe, expect, it } from 'vitest';

import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { BLACK, rgba, WHITE } from '@core/types/color';

import { encodeGif } from './gif';

/** Decode the subset of GIF89a the encoder produces: global palette, per-frame LZW. */
function decodeGif(bytes: Uint8Array): {
  width: number;
  height: number;
  frames: { pixels: number[][]; delayCs: number }[];
} {
  expect(String.fromCharCode(...bytes.subarray(0, 6))).toBe('GIF89a');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint16(6, true);
  const height = view.getUint16(8, true);
  const packed = bytes[10]!;
  const gctSize = 2 << (packed & 0x07);
  let offset = 13;
  const palette: [number, number, number][] = [];
  for (let i = 0; i < gctSize; i += 1) {
    palette.push([bytes[offset]!, bytes[offset + 1]!, bytes[offset + 2]!]);
    offset += 3;
  }

  const frames: { pixels: number[][]; delayCs: number }[] = [];
  let pendingDelay = 0;

  while (offset < bytes.length) {
    const marker = bytes[offset];
    if (marker === 0x3b) {
      break;
    }
    if (marker === 0x21) {
      const label = bytes[offset + 1];
      offset += 2;
      if (label === 0xf9) {
        const size = bytes[offset]!;
        pendingDelay = view.getUint16(offset + 2, true);
        offset += size + 1;
      }
      // skip remaining sub-blocks
      while (bytes[offset] !== 0) {
        offset += bytes[offset]! + 1;
      }
      offset += 1;
      continue;
    }
    if (marker === 0x2c) {
      // image descriptor
      const iw = view.getUint16(offset + 5, true);
      const ih = view.getUint16(offset + 7, true);
      const localPacked = bytes[offset + 9]!;
      offset += 10;
      if (localPacked & 0x80) {
        offset += 3 * (2 << (localPacked & 0x07));
      }
      const minCode = bytes[offset]!;
      offset += 1;
      const data: number[] = [];
      while (bytes[offset] !== 0) {
        const len = bytes[offset]!;
        for (let i = 1; i <= len; i += 1) {
          data.push(bytes[offset + i]!);
        }
        offset += len + 1;
      }
      offset += 1;
      const indices = lzwDecode(data, minCode);
      const pixels: number[][] = [];
      for (let y = 0; y < ih; y += 1) {
        pixels.push(indices.slice(y * iw, (y + 1) * iw));
      }
      frames.push({ pixels, delayCs: pendingDelay });
      pendingDelay = 0;
      continue;
    }
    break;
  }
  return { width, height, frames };
}

function lzwDecode(data: number[], minCodeSize: number): number[] {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  let codeSize = minCodeSize + 1;
  let dict: number[][] = [];
  const reset = (): void => {
    dict = [];
    for (let i = 0; i < clear; i += 1) {
      dict.push([i]);
    }
    dict.push([]); // clear
    dict.push([]); // end
    codeSize = minCodeSize + 1;
  };
  reset();

  const out: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;
  let pos = 0;
  let prev: number[] | null = null;

  const read = (): number => {
    while (bitCount < codeSize) {
      bitBuffer |= (data[pos++] ?? 0) << bitCount;
      bitCount += 8;
    }
    const code = bitBuffer & ((1 << codeSize) - 1);
    bitBuffer >>= codeSize;
    bitCount -= codeSize;
    return code;
  };

  for (;;) {
    const code = read();
    if (code === end || pos > data.length + 2) {
      break;
    }
    if (code === clear) {
      reset();
      prev = null;
      continue;
    }
    let entry: number[];
    if (dict[code]) {
      entry = dict[code];
    } else if (prev) {
      entry = [...prev, prev[0]!];
    } else {
      break;
    }
    out.push(...entry);
    if (prev) {
      dict.push([...prev, entry[0]!]);
      if (dict.length === 1 << codeSize && codeSize < 12) {
        codeSize += 1;
      }
    }
    prev = entry;
  }
  return out;
}

describe('encodeGif', () => {
  it('encodes a static image that round-trips through its own decoder', () => {
    const buffer = PixelBuffer.create(4, 3);
    buffer.setPixel(0, 0, BLACK);
    buffer.setPixel(3, 2, rgba(255, 0, 0, 255));
    buffer.setPixel(1, 1, WHITE);

    const gif = decodeGif(encodeGif([{ buffer, delayMs: 0 }]));
    expect(gif.width).toBe(4);
    expect(gif.height).toBe(3);
    expect(gif.frames).toHaveLength(1);
    // reconstruct via the palette order: index 0 = black (first, most-frequent tie-break),
    // just assert distinct indices where distinct colours were painted
    const px = gif.frames[0]!.pixels;
    expect(px[0]![0]).not.toBe(px[1]![1]); // black vs white
    expect(px[2]![3]).not.toBe(px[0]![0]); // red vs black
  });

  it('encodes an animation with per-frame delays and the Netscape loop block', () => {
    const a = PixelBuffer.create(2, 2);
    a.setPixel(0, 0, BLACK);
    const b = PixelBuffer.create(2, 2);
    b.setPixel(1, 1, WHITE);

    const bytes = encodeGif(
      [
        { buffer: a, delayMs: 100 },
        { buffer: b, delayMs: 250 },
      ],
      { loop: 0 },
    );
    // Netscape 2.0 application extension present
    expect(String.fromCharCode(...bytes).includes('NETSCAPE2.0')).toBe(true);

    const gif = decodeGif(bytes);
    expect(gif.frames.map((f) => f.delayCs)).toEqual([10, 25]);
  });

  it('reserves a transparent slot when any pixel is not opaque', () => {
    const buffer = PixelBuffer.create(2, 2);
    buffer.setPixel(0, 0, BLACK); // rest transparent
    const bytes = encodeGif([{ buffer, delayMs: 0 }]);
    // Graphic Control Extension with the transparent flag set
    const gceIndex = bytes.indexOf(0xf9);
    expect(bytes[gceIndex - 1]).toBe(0x21);
    expect((bytes[gceIndex + 2]! & 0x01) === 0x01).toBe(true);
    expect(() => decodeGif(bytes)).not.toThrow();
  });

  it('handles more colours than fit in the palette without throwing', () => {
    const buffer = PixelBuffer.create(20, 20);
    for (let y = 0; y < 20; y += 1) {
      for (let x = 0; x < 20; x += 1) {
        buffer.setPixel(x, y, rgba((x * 13) % 256, (y * 17) % 256, ((x + y) * 7) % 256, 255));
      }
    }
    const gif = decodeGif(encodeGif([{ buffer, delayMs: 0 }]));
    expect(gif.frames[0]!.pixels).toHaveLength(20);
  });

  it('still produces a valid file for a fully transparent frame', () => {
    const bytes = encodeGif([{ buffer: PixelBuffer.create(3, 3), delayMs: 0 }]);
    expect(bytes[bytes.length - 1]).toBe(0x3b);
  });
});
