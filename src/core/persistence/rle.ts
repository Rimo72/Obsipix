import { PixelBuffer } from '@core/pixels/PixelBuffer';

import { ByteReader, ByteWriter } from './ByteWriter';

/**
 * Run-length encode a pixel buffer: a sequence of `varint(runLength)` followed
 * by the 4 RGBA bytes repeated for that run. Pixel art compresses to a tiny
 * fraction of its raw size; worst case (all-distinct) is ~1.25x.
 */
export function encodeRle(buffer: PixelBuffer): Uint8Array {
  const bytes = buffer.toBytes();
  const pixelCount = buffer.width * buffer.height;
  const writer = new ByteWriter(Math.max(64, pixelCount));

  let index = 0;
  while (index < pixelCount) {
    const base = index * 4;
    const r = bytes[base] ?? 0;
    const g = bytes[base + 1] ?? 0;
    const b = bytes[base + 2] ?? 0;
    const a = bytes[base + 3] ?? 0;

    let run = 1;
    while (index + run < pixelCount) {
      const next = (index + run) * 4;
      if (
        bytes[next] !== r ||
        bytes[next + 1] !== g ||
        bytes[next + 2] !== b ||
        bytes[next + 3] !== a
      ) {
        break;
      }
      run += 1;
    }

    writer.varint(run);
    writer.u8(r);
    writer.u8(g);
    writer.u8(b);
    writer.u8(a);
    index += run;
  }

  return writer.toUint8Array();
}

/** Inverse of {@link encodeRle}. Throws if the runs do not total `width * height`. */
export function decodeRle(data: Uint8Array, width: number, height: number): PixelBuffer {
  const pixelCount = width * height;
  const out = new Uint8ClampedArray(pixelCount * 4);
  const reader = new ByteReader(data);

  let index = 0;
  while (index < pixelCount) {
    if (reader.remaining === 0) {
      throw new RangeError('RLE data ended before all pixels were decoded');
    }
    const run = reader.varint();
    const r = reader.u8();
    const g = reader.u8();
    const b = reader.u8();
    const a = reader.u8();
    if (run === 0 || index + run > pixelCount) {
      throw new RangeError('RLE run length is out of range');
    }
    for (let i = 0; i < run; i += 1) {
      const base = (index + i) * 4;
      out[base] = r;
      out[base + 1] = g;
      out[base + 2] = b;
      out[base + 3] = a;
    }
    index += run;
  }

  if (reader.remaining !== 0) {
    throw new RangeError('RLE data has trailing bytes');
  }
  return PixelBuffer.fromBytes(width, height, out);
}
