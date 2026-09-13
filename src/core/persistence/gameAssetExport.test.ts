import { describe, expect, it } from 'vitest';

import { DocumentFactory } from '@core/document/DocumentFactory';
import { Asset } from '@core/project/Asset';
import { createSequentialProjectIdFactory } from '@core/project/ProjectIdFactory';
import { instantiateTemplate } from '@core/project/instantiateTemplate';
import { createSeedTemplateRegistry } from '@core/project/seedTemplates';

import { exportGameAsset } from './gameAssetExport';
import { GODOT_EXPORT_PROFILE } from './godotExportProfile';

describe('exportGameAsset (V2 coding-phases Phase 8)', () => {
  it('exports a single-frame asset as a 1x1 sheet at the document size', () => {
    const document = new DocumentFactory().create({ width: 16, height: 16 });
    const asset = new Asset(createSequentialProjectIdFactory().asset(), document);

    const { image, metadata } = exportGameAsset(asset);
    expect(image.width).toBe(16);
    expect(image.height).toBe(16);
    expect(metadata.frames).toBe(1);
    expect(metadata.resolution).toBe(16);
  });

  it('packs every frame left-to-right for the default horizontal layout, correct combined width', () => {
    const document = new DocumentFactory().create({ width: 8, height: 8 });
    document.addFrame();
    document.addFrame();
    const asset = new Asset(createSequentialProjectIdFactory().asset(), document);

    const { image, metadata } = exportGameAsset(asset);
    expect(metadata.frames).toBe(3);
    expect(image.width).toBe(24); // 3 frames x 8px, no spacing by default
    expect(image.height).toBe(8);
  });

  it('applies scale to every packed frame', () => {
    const document = new DocumentFactory().create({ width: 8, height: 8 });
    document.addFrame();
    const asset = new Asset(createSequentialProjectIdFactory().asset(), document);

    const { image } = exportGameAsset(asset, { scale: 2 });
    expect(image.width).toBe(32); // 2 frames x 16px (8px x2 scale)
    expect(image.height).toBe(16);
  });

  it('packs a 9-frame terrain set into a 3x3 grid tileset when columns is 3', () => {
    const registry = createSeedTemplateRegistry();
    const { document, metadata: assetMetadata } = instantiateTemplate(
      registry.get('terrain-grass-tile'),
    );
    const asset = new Asset(createSequentialProjectIdFactory().asset(), document, {
      metadata: assetMetadata,
    });

    const { image, metadata } = exportGameAsset(asset, { layout: 'grid', columns: 3 });
    expect(metadata.frames).toBe(9);
    expect(image.width).toBe(96); // 3 cols x 32px
    expect(image.height).toBe(96); // 3 rows x 32px
    expect(metadata.type).toBe('terrain');
  });

  it('restricts export to a frame range, e.g. one animation state', () => {
    const document = new DocumentFactory().create({ width: 8, height: 8 });
    // frames: 0 (idle), 1-3 (walk), 4 (idle again) — a 4-frame walk range
    document.addFrame();
    document.addFrame();
    document.addFrame();
    document.addFrame();
    document.timeline.addTag({ name: 'Walk', startFrame: 1, endFrame: 3, direction: 'forward' });
    const asset = new Asset(createSequentialProjectIdFactory().asset(), document);

    const walkTag = document.timeline.tags.find((tag) => tag.name === 'Walk')!;
    const { image, metadata } = exportGameAsset(asset, {
      frameRange: { start: walkTag.startFrame, end: walkTag.endFrame },
    });

    expect(metadata.frames).toBe(3); // frames 1, 2, 3
    expect(image.width).toBe(24); // 3 x 8px
  });

  it('clamps an out-of-range frameRange instead of throwing', () => {
    const document = new DocumentFactory().create({ width: 8, height: 8 });
    document.addFrame();
    const asset = new Asset(createSequentialProjectIdFactory().asset(), document);

    const { metadata } = exportGameAsset(asset, { frameRange: { start: 0, end: 99 } });
    expect(metadata.frames).toBe(2); // clamped to the 2 real frames
  });

  it("feeds the packed grid shape to a chosen profile (V2 coding-phases Phase 9's Godot profile)", () => {
    const registry = createSeedTemplateRegistry();
    const { document, metadata: assetMetadata } = instantiateTemplate(
      registry.get('terrain-grass-tile'),
    );
    const asset = new Asset(createSequentialProjectIdFactory().asset(), document, {
      metadata: assetMetadata,
    });

    const { metadata } = exportGameAsset(asset, {
      layout: 'grid',
      columns: 3,
      profile: GODOT_EXPORT_PROFILE,
    });

    expect(metadata).toMatchObject({
      engine: 'godot',
      columns: 3,
      rows: 3,
      frame_width: 32,
      frame_height: 32,
    });
  });

  it('the asset/type/perspective/frames metadata matches the vision doc §13 schema exactly', () => {
    const document = new DocumentFactory().create({
      width: 32,
      height: 32,
      name: 'Forest Tree',
    });
    const asset = new Asset(createSequentialProjectIdFactory().asset(), document, {
      metadata: {
        category: 'object',
        perspective: { ...instantiateTemplate(undefined).metadata.perspective, kind: 'top_down' },
        resolution: { preset: '32x32', width: 32, height: 32 },
      },
    });

    const { metadata } = exportGameAsset(asset);
    expect(metadata).toEqual({
      asset: 'forest_tree',
      type: 'object',
      resolution: 32,
      perspective: 'top_down',
      frames: 1,
    });
  });
});
