/*
 * The metadata is `JSON.parse` output that we cast to `ObsipixMetadata` after a
 * structural check. TypeScript then believes the deep contents (buffer refs,
 * cel data, tag fields) are well-typed, but they are still untrusted file data,
 * so the runtime guards below are deliberate, not redundant.
 */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import type { AnimationTag, TagDirection } from '@core/document/AnimationTag';
import { Cel } from '@core/document/Cel';
import { Document, type Palette } from '@core/document/Document';
import { Frame } from '@core/document/Frame';
import { createIdFactory, type IdFactory } from '@core/document/IdFactory';
import { Layer } from '@core/document/Layer';
import { LayerCollection } from '@core/document/LayerCollection';
import { SelectionState } from '@core/document/Selection';
import { Timeline } from '@core/document/Timeline';
import { assertDocumentInvariants } from '@core/document/invariants';
import type { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { RGBA } from '@core/types/color';
import type {
  AnimationTagId,
  CelId,
  FrameId,
  LayerId,
  PaletteColorId,
  PaletteId,
} from '@core/types/ids';

import { ByteReader } from './ByteWriter';
import { crc32 } from './crc32';
import {
  OBSIPIX_FORMAT_VERSION,
  OBSIPIX_MAGIC,
  ObsipixParseError,
  type ObsipixMetadata,
} from './format';
import { decodeRle } from './rle';

// The parse boundary turns untrusted strings from the file into branded ids.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const brand = <T>(value: string): T => value as unknown as T;

function readTuple4(value: unknown): RGBA {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new ObsipixParseError('Expected a 4-number colour tuple');
  }
  const [r, g, b, a] = value as unknown[];
  for (const channel of [r, g, b, a]) {
    if (typeof channel !== 'number' || !Number.isInteger(channel) || channel < 0 || channel > 255) {
      throw new ObsipixParseError('Colour channel out of range');
    }
  }
  return { r: r as number, g: g as number, b: b as number, a: a as number };
}

/** Very small structural check — enough to reject a file that is not this format. */
function assertShape(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ObsipixParseError(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readMetadata(bytes: Uint8Array): ObsipixMetadata {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    throw new ObsipixParseError('Metadata could not be read', error);
  }

  assertShape(isRecord(parsed), 'Metadata is not an object');
  assertShape(
    isRecord(parsed.format) && parsed.format.version === OBSIPIX_FORMAT_VERSION,
    'Unsupported or missing metadata version',
  );
  assertShape(
    isRecord(parsed.document) &&
      typeof parsed.document.width === 'number' &&
      typeof parsed.document.height === 'number',
    'Missing document dimensions',
  );
  assertShape(Array.isArray(parsed.layers) && parsed.layers.length >= 1, 'Missing layers');
  assertShape(Array.isArray(parsed.buffers), 'Missing buffer table');
  assertShape(
    isRecord(parsed.animation) && Array.isArray(parsed.animation.frames),
    'Missing frames',
  );

  return parsed as unknown as ObsipixMetadata;
}

/**
 * Parse `.obsipix` bytes into a fresh, saved (not dirty) {@link Document}.
 * Every failure is an {@link ObsipixParseError}; the caller's current document
 * is never touched by a failed load (PROJECT_CORE §15).
 */
export function parseDocument(fileBytes: Uint8Array, ids: IdFactory = createIdFactory()): Document {
  if (fileBytes.length < OBSIPIX_MAGIC.length + 12) {
    throw new ObsipixParseError('File is too short to be an .obsipix project');
  }
  for (let i = 0; i < OBSIPIX_MAGIC.length; i += 1) {
    if (fileBytes[i] !== OBSIPIX_MAGIC[i]) {
      throw new ObsipixParseError('Not an .obsipix file (bad signature)');
    }
  }

  const body = fileBytes.subarray(0, fileBytes.length - 4);
  const storedCrc = new ByteReader(fileBytes.subarray(fileBytes.length - 4)).u32();
  if (crc32(body) !== storedCrc) {
    throw new ObsipixParseError('File is corrupt (checksum mismatch)');
  }

  const reader = new ByteReader(body);
  reader.bytes(OBSIPIX_MAGIC.length);
  const version = reader.u16();
  if (version !== OBSIPIX_FORMAT_VERSION) {
    throw new ObsipixParseError(`Unsupported .obsipix version ${version}`);
  }
  reader.u16();

  const metadata = readMetadata(reader.bytes(reader.u32()));
  const pixelSection = reader.bytes(reader.u32());

  const dimensions = { width: metadata.document.width, height: metadata.document.height };
  if (
    !Number.isInteger(dimensions.width) ||
    !Number.isInteger(dimensions.height) ||
    dimensions.width <= 0 ||
    dimensions.height <= 0
  ) {
    throw new ObsipixParseError('Invalid document dimensions');
  }

  const buffers: PixelBuffer[] = metadata.buffers.map((ref, index) => {
    if (ref.encoding !== 'rle-rgba8') {
      throw new ObsipixParseError(`Buffer ${index} uses an unknown encoding`);
    }
    if (ref.width !== dimensions.width || ref.height !== dimensions.height) {
      throw new ObsipixParseError(`Buffer ${index} size does not match the document`);
    }
    if (ref.offset < 0 || ref.length < 0 || ref.offset + ref.length > pixelSection.length) {
      throw new ObsipixParseError(`Buffer ${index} lies outside the pixel section`);
    }
    try {
      return decodeRle(
        pixelSection.subarray(ref.offset, ref.offset + ref.length),
        ref.width,
        ref.height,
      );
    } catch (error) {
      throw new ObsipixParseError(`Buffer ${index} could not be decoded`, error);
    }
  });

  const bufferFor = (index: number): PixelBuffer => {
    const buffer = buffers[index];
    if (!buffer) {
      throw new ObsipixParseError(`Cel references missing buffer ${index}`);
    }
    return buffer;
  };

  const [firstLayer, ...restLayers] = metadata.layers;
  if (!firstLayer) {
    throw new ObsipixParseError('Document has no layers');
  }
  const toLayer = (data: (typeof metadata.layers)[number]): Layer =>
    new Layer(brand<LayerId>(data.id), {
      name: data.name,
      visible: data.visible,
      locked: data.locked,
      opacity: data.opacity,
    });
  const layers = new LayerCollection(toLayer(firstLayer));
  for (const layerData of restLayers) {
    layers.insertAt(toLayer(layerData));
  }
  if (metadata.layers.some((layer) => layer.id === metadata.activeLayerId)) {
    layers.setActive(brand<LayerId>(metadata.activeLayerId));
  }

  const frames: Frame[] = metadata.animation.frames.map((frameData) => {
    const frame = new Frame(brand<FrameId>(frameData.id), frameData.durationMs);
    for (const [layerId, celData] of Object.entries(frameData.cels)) {
      const celId = brand<CelId>(`cel_${layerId}_${frameData.id}`);
      const layer = brand<LayerId>(layerId);
      if (celData.type === 'empty') {
        frame.setCel(layer, Cel.empty(celId));
      } else if (celData.type === 'hold') {
        frame.setCel(layer, Cel.hold(celId));
      } else {
        const buffer = bufferFor(celData.buffer);
        frame.setCel(
          layer,
          celData.type === 'linked' ? Cel.linked(celId, buffer) : Cel.normal(celId, buffer),
        );
      }
    }
    return frame;
  });

  const tags: AnimationTag[] = metadata.animation.tags.map((tagData) => {
    const direction: TagDirection =
      tagData.direction === 'reverse' || tagData.direction === 'ping-pong'
        ? tagData.direction
        : 'forward';
    const tag: AnimationTag = {
      id: brand<AnimationTagId>(tagData.id),
      name: tagData.name,
      startFrame: tagData.startFrame,
      endFrame: tagData.endFrame,
      direction,
    };
    if (tagData.color) {
      tag.color = readTuple4(tagData.color);
    }
    if (typeof tagData.fps === 'number') {
      tag.fps = tagData.fps;
    }
    return tag;
  });

  const timeline = Timeline.restore(
    ids,
    dimensions,
    frames,
    brand<FrameId>(metadata.animation.activeFrameId),
    tags,
  );

  const palettes: Palette[] = metadata.palettes.map((paletteData) => ({
    id: brand<PaletteId>(paletteData.id),
    name: paletteData.name,
    colors: paletteData.colors.map((color) => {
      const entry: Palette['colors'][number] = {
        id: color.id ? brand<PaletteColorId>(color.id) : ids.paletteColor(),
        rgba: readTuple4(color.rgba),
      };
      if (typeof color.name === 'string' && color.name !== '') {
        entry.name = color.name;
      }
      return entry;
    }),
  }));

  const activePaletteId =
    typeof metadata.activePaletteId === 'string' &&
    palettes.some((palette) => palette.id === metadata.activePaletteId)
      ? brand<PaletteId>(metadata.activePaletteId)
      : (palettes[0]?.id ?? null);

  const document = Document.create({
    id: ids.document(),
    dimensions,
    metadata: { name: metadata.project.name },
    layers,
    timeline,
    selection: new SelectionState(dimensions),
    palettes,
    activePaletteId,
    ids,
  });

  try {
    assertDocumentInvariants(document);
  } catch (error) {
    throw new ObsipixParseError('The file does not describe a valid document', error);
  }

  return document;
}
