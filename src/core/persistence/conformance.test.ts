import { describe, expect, it } from 'vitest';

import { DocumentFactory } from '@core/document/DocumentFactory';
import type { Document } from '@core/document/Document';
import { createSequentialIdFactory } from '@core/document/IdFactory';
import { BLACK, rgba, rgbaEquals, WHITE } from '@core/types/color';

import { parseDocument } from './parse';
import { serializeDocument } from './serialize';

/**
 * PROJECT_CORE §3.10 lists exactly what a `.obsipix` project must preserve
 * across a save/open round trip. One assertion per bullet, so the spec can be
 * checked against the code line by line.
 */

function projectUnderTest(): Document {
  // Dimensions (non-default)
  const document = new DocumentFactory(createSequentialIdFactory()).create({
    width: 20,
    height: 16,
    name: 'Conformance',
  });

  // Layers + layer properties
  const base = document.layers.activeLayerId;
  document.layers.require(base).rename('Ink');
  const shade = document.addLayer('Shade');
  document.layers.require(shade).setOpacity(0.4);
  document.layers.require(shade).setLocked(true);
  const hidden = document.addLayer('Hidden');
  document.layers.require(hidden).setVisible(false);

  // Pixel colours + alpha (fully opaque, partial alpha)
  document.resolveBuffer(base)?.setPixel(0, 0, BLACK);
  document.resolveBuffer(base)?.setPixel(1, 1, rgba(12, 34, 56, 78));

  // Frames + frame durations + cel kinds (normal / empty / hold / linked)
  const f1 = document.timeline.activeFrameId;
  const f2 = document.duplicateFrame(f1);
  document.timeline.requireFrame(f2).setDurationMs(240);
  const f3 = document.addEmptyFrame(); // empty cel on every layer
  document.holdCel(f3, base); // hold cel
  document.linkCel(f1, f3, shade); // linked cel

  // Palettes (a second one with a named colour) + active palette
  const greys = document.createPalette('Greys', [rgba(20, 20, 20, 255), WHITE]);
  document.addPaletteColor(greys, rgba(128, 128, 128, 255), 'mid');
  document.setActivePalette(greys);

  // Animation tags + relevant animation settings
  document.timeline.addTag({
    name: 'idle',
    startFrame: 0,
    endFrame: 2,
    direction: 'ping-pong',
    color: rgba(255, 128, 0, 255),
    fps: 8,
  });
  document.timeline.setPlaybackFps(15);
  document.timeline.setOnionSkin({ enabled: true, previous: 2, next: 1, opacity: 0.6 });

  document.setActiveLayer(shade);
  document.setActiveFrame(f2);
  return document;
}

describe('.obsipix §3.10 conformance', () => {
  const original = projectUnderTest();
  const reloaded = parseDocument(serializeDocument(original), createSequentialIdFactory());

  it('preserves dimensions', () => {
    expect(reloaded.dimensions).toEqual({ width: 20, height: 16 });
  });

  it('preserves pixel colours', () => {
    expect(
      rgbaEquals(reloaded.resolveBuffer(reloaded.layers.layers[0]!.id)!.getPixel(0, 0), BLACK),
    ).toBe(true);
  });

  it('preserves alpha', () => {
    expect(reloaded.resolveBuffer(reloaded.layers.layers[0]!.id)!.getPixel(1, 1)).toEqual({
      r: 12,
      g: 34,
      b: 56,
      a: 78,
    });
  });

  it('preserves layers and their order', () => {
    expect(reloaded.layers.layers.map((l) => l.name)).toEqual(['Ink', 'Shade', 'Hidden']);
  });

  it('preserves layer properties (opacity, locked, visible)', () => {
    const shade = reloaded.layers.layers[1]!;
    expect(shade.opacity).toBeCloseTo(0.4);
    expect(shade.locked).toBe(true);
    expect(reloaded.layers.layers[2]!.visible).toBe(false);
  });

  it('preserves palettes and the active palette', () => {
    expect(reloaded.palettes).toHaveLength(2);
    expect(reloaded.palettes[1]?.name).toBe('Greys');
    expect(reloaded.activePalette?.name).toBe('Greys');
    const greys = reloaded.palettes.find((p) => p.name === 'Greys')!;
    expect(greys.colors.at(-1)?.name).toBe('mid');
  });

  it('preserves frames and frame durations', () => {
    expect(reloaded.timeline.frameCount).toBe(3);
    expect(reloaded.timeline.frames.map((f) => f.durationMs)).toEqual([100, 240, 100]);
  });

  it('preserves cel kinds — normal, empty, hold and linked', () => {
    const [f1, , f3] = reloaded.timeline.frames;
    const ink = reloaded.layers.layers[0]!.id;
    const shade = reloaded.layers.layers[1]!.id;
    const hidden = reloaded.layers.layers[2]!.id;
    expect(f1!.requireCel(ink).type).toBe('normal');
    expect(f3!.requireCel(hidden).type).toBe('empty');
    expect(f3!.requireCel(ink).type).toBe('hold');
    expect(f3!.requireCel(shade).type).toBe('linked');
  });

  it('keeps a linked cel sharing pixel data after reload', () => {
    const [f1, , f3] = reloaded.timeline.frames;
    const shade = reloaded.layers.layers[1]!.id;
    reloaded.resolveBuffer(shade, f1!.id)?.setPixel(5, 5, WHITE);
    expect(rgbaEquals(reloaded.resolveBuffer(shade, f3!.id)?.getPixel(5, 5) ?? BLACK, WHITE)).toBe(
      true,
    );
  });

  it('preserves animation tags', () => {
    expect(reloaded.timeline.tags).toHaveLength(1);
    const [tag] = reloaded.timeline.tags;
    expect(typeof tag?.id).toBe('string');
    expect(tag).toMatchObject({
      name: 'idle',
      startFrame: 0,
      endFrame: 2,
      direction: 'ping-pong',
      color: { r: 255, g: 128, b: 0, a: 255 },
      fps: 8,
    });
  });

  it('preserves relevant animation settings (playback fps, onion skin)', () => {
    expect(reloaded.timeline.playbackFps).toBe(15);
    expect(reloaded.timeline.onionSkin).toEqual({
      enabled: true,
      previous: 2,
      next: 1,
      opacity: 0.6,
    });
  });

  it('restores the active layer and frame', () => {
    expect(reloaded.layers.activeLayer.name).toBe('Shade');
    expect(reloaded.timeline.indexOf(reloaded.timeline.activeFrameId)).toBe(1);
  });

  it('loads a saved project as clean (not dirty)', () => {
    expect(reloaded.isDirty).toBe(false);
  });
});
