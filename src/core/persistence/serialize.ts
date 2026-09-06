import type { Document } from '@core/document/Document';
import type { PixelBuffer } from '@core/pixels/PixelBuffer';

import { ByteWriter } from './ByteWriter';
import { crc32 } from './crc32';
import {
  OBSIPIX_APPLICATION,
  OBSIPIX_FORMAT_VERSION,
  OBSIPIX_MAGIC,
  type ObsipixBufferRef,
  type ObsipixCelData,
  type ObsipixFrameData,
  type ObsipixMetadata,
} from './format';
import { encodeRle } from './rle';

function collectBuffers(document: Document): Map<PixelBuffer, number> {
  const order = new Map<PixelBuffer, number>();
  for (const frame of document.timeline.frames) {
    for (const cel of frame.cels()) {
      const buffer = cel.buffer;
      if (buffer && !order.has(buffer)) {
        order.set(buffer, order.size);
      }
    }
  }
  return order;
}

function celData(
  type: 'normal' | 'empty' | 'hold' | 'linked',
  bufferIndex: number | undefined,
): ObsipixCelData {
  if (type === 'empty' || type === 'hold') {
    return { type };
  }
  if (bufferIndex === undefined) {
    throw new Error(`Cel of type "${type}" has no buffer to serialize`);
  }
  return { type, buffer: bufferIndex };
}

/**
 * Serialize a {@link Document} to `.obsipix` bytes. Deterministic: the same
 * document always produces the same file. Linked cels share a buffer entry.
 */
export function serializeDocument(document: Document): Uint8Array {
  const bufferOrder = collectBuffers(document);
  const uniqueBuffers = [...bufferOrder.keys()];

  const pixelSection = new ByteWriter(1024);
  const bufferRefs: ObsipixBufferRef[] = uniqueBuffers.map((buffer) => {
    const encoded = encodeRle(buffer);
    const ref: ObsipixBufferRef = {
      encoding: 'rle-rgba8',
      width: buffer.width,
      height: buffer.height,
      offset: pixelSection.length,
      length: encoded.length,
    };
    pixelSection.bytes(encoded);
    return ref;
  });

  const frames: ObsipixFrameData[] = document.timeline.frames.map((frame) => {
    const cels: Record<string, ObsipixCelData> = {};
    for (const layerId of frame.layerIds()) {
      const cel = frame.requireCel(layerId);
      const bufferIndex = cel.buffer ? bufferOrder.get(cel.buffer) : undefined;
      cels[layerId] = celData(cel.type, bufferIndex);
    }
    return { id: frame.id, durationMs: frame.durationMs, cels };
  });

  const metadata: ObsipixMetadata = {
    format: { version: OBSIPIX_FORMAT_VERSION, application: OBSIPIX_APPLICATION },
    project: { name: document.metadata.name },
    document: {
      width: document.dimensions.width,
      height: document.dimensions.height,
      colorMode: 'rgba',
      pixelAspect: 1,
    },
    layers: document.layers.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
    })),
    activeLayerId: document.layers.activeLayerId,
    activePaletteId: document.activePaletteId,
    buffers: bufferRefs,
    animation: {
      frames,
      activeFrameId: document.timeline.activeFrameId,
      tags: document.timeline.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        startFrame: tag.startFrame,
        endFrame: tag.endFrame,
        direction: tag.direction,
        ...(tag.color
          ? { color: [tag.color.r, tag.color.g, tag.color.b, tag.color.a] as const }
          : {}),
        ...(tag.fps !== undefined ? { fps: tag.fps } : {}),
      })),
      playback: {},
      onionSkin: {},
    },
    palettes: document.palettes.map((palette) => ({
      id: palette.id,
      name: palette.name,
      colors: palette.colors.map((color) => ({
        id: color.id,
        rgba: [color.rgba.r, color.rgba.g, color.rgba.b, color.rgba.a] as const,
        ...(color.name !== undefined ? { name: color.name } : {}),
      })),
    })),
  };

  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
  const pixelBytes = pixelSection.toUint8Array();

  const body = new ByteWriter(32 + metadataBytes.length + pixelBytes.length);
  for (const byte of OBSIPIX_MAGIC) {
    body.u8(byte);
  }
  body.u16(OBSIPIX_FORMAT_VERSION);
  body.u16(0);
  body.u32(metadataBytes.length);
  body.bytes(metadataBytes);
  body.u32(pixelBytes.length);
  body.bytes(pixelBytes);

  const bodyBytes = body.toUint8Array();
  const file = new ByteWriter(bodyBytes.length + 4);
  file.bytes(bodyBytes);
  file.u32(crc32(bodyBytes));
  return file.toUint8Array();
}
