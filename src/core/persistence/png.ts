import { compositeDocument } from '@core/document/compositeDocument';
import type { Document } from '@core/document/Document';
import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { FrameId } from '@core/types/ids';

import { ByteWriter } from './ByteWriter';
import { crc32 } from './crc32';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    a = (a + (bytes[i] ?? 0)) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** A valid zlib stream using only uncompressed (stored) DEFLATE blocks — no compressor needed. */
function zlibStored(raw: Uint8Array): Uint8Array {
  const writer = new ByteWriter(raw.length + 64);
  writer.u8(0x78); // CMF: deflate, 32K window
  writer.u8(0x01); // FLG: no dict, check bits

  const maxBlock = 0xffff;
  for (let offset = 0; offset < raw.length; offset += maxBlock) {
    const block = raw.subarray(offset, offset + maxBlock);
    const isFinal = offset + maxBlock >= raw.length;
    writer.u8(isFinal ? 1 : 0);
    writer.u8(block.length & 0xff);
    writer.u8((block.length >>> 8) & 0xff);
    writer.u8(~block.length & 0xff);
    writer.u8((~block.length >>> 8) & 0xff);
    writer.bytes(block);
  }

  const check = adler32(raw);
  writer.u8((check >>> 24) & 0xff);
  writer.u8((check >>> 16) & 0xff);
  writer.u8((check >>> 8) & 0xff);
  writer.u8(check & 0xff);
  return writer.toUint8Array();
}

function chunk(writer: ByteWriter, type: string, data: Uint8Array): void {
  writer.u32be(data.length);
  const typed = new ByteWriter(4 + data.length);
  for (let i = 0; i < type.length; i += 1) {
    typed.u8(type.charCodeAt(i));
  }
  typed.bytes(data);
  const typedBytes = typed.toUint8Array();
  writer.bytes(typedBytes);
  writer.u32be(crc32(typedBytes));
}

/** Encode an RGBA {@link PixelBuffer} as a PNG (8-bit, colour type 6). */
export function encodePng(buffer: PixelBuffer): Uint8Array {
  const { width, height } = buffer;
  const source = buffer.toBytes();

  // scanlines with a leading "None" filter byte per row
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    raw.set(source.subarray(y * width * 4, (y + 1) * width * 4), rowStart + 1);
  }

  const ihdr = new ByteWriter(13);
  ihdr.u32be(width);
  ihdr.u32be(height);
  ihdr.u8(8); // bit depth
  ihdr.u8(6); // colour type: truecolour + alpha
  ihdr.u8(0); // compression
  ihdr.u8(0); // filter
  ihdr.u8(0); // interlace

  const png = new ByteWriter(raw.length + 128);
  for (const byte of PNG_SIGNATURE) {
    png.u8(byte);
  }
  chunk(png, 'IHDR', ihdr.toUint8Array());
  chunk(png, 'IDAT', zlibStored(raw));
  chunk(png, 'IEND', new Uint8Array(0));
  return png.toUint8Array();
}

/**
 * Export a flattened PNG of the document at the given frame (default: the
 * active frame). Editor overlays are never included (PROJECT_CORE §3.11).
 */
export function exportPng(document: Document, frameId?: FrameId): Uint8Array {
  const flattened =
    frameId === undefined ? compositeDocument(document) : compositeDocument(document, frameId);
  return encodePng(flattened);
}
