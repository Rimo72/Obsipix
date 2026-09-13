import { describe, expect, it } from 'vitest';

import { createSequentialIdFactory } from '@core/document/IdFactory';
import { rgbaEquals, TRANSPARENT, type RGBA } from '@core/types/color';

import { inferAssetMetadata } from './AssetMetadata';
import { instantiateTemplate } from './instantiateTemplate';
import { getPerspective } from './Perspective';
import type { ProjectStyle } from './ProjectStyle';
import { SEED_TEMPLATES, createSeedTemplateRegistry } from './seedTemplates';
import type { Template } from './Template';
import { TemplateRegistry } from './TemplateRegistry';
import { TERRAIN_TILE_ROLES } from './TerrainTileRole';

const FULL_TEMPLATE: Template = {
  id: 'test-full',
  name: 'Test Full',
  category: 'character',
  assetType: 'hero',
  perspective: 'isometric',
  canvasSize: { width: 16, height: 24 },
  layerNames: ['Base', 'Outline', 'Fx'],
  paletteColors: [
    { r: 10, g: 20, b: 30, a: 255 },
    { r: 40, g: 50, b: 60, a: 255 },
  ],
};

const MINIMAL_TEMPLATE: Template = {
  id: 'test-minimal',
  name: 'Test Minimal',
  category: 'item',
  assetType: 'gem',
  perspective: 'side_view',
  canvasSize: { width: 8, height: 8 },
};

function paletteRgbas(colors: readonly { rgba: RGBA }[]): RGBA[] {
  return colors.map((c) => c.rgba);
}

describe('instantiateTemplate (V2 coding-phases Phase 2)', () => {
  it('applies every configured field from a fully-specified template', () => {
    const { document, metadata } = instantiateTemplate(FULL_TEMPLATE, {
      ids: createSequentialIdFactory(),
    });

    expect(document.dimensions).toEqual({ width: 16, height: 24 });
    expect(document.layers.layers.map((l) => l.name)).toEqual(['Base', 'Outline', 'Fx']);
    expect(document.palettes).toHaveLength(1);
    expect(paletteRgbas(document.palettes[0]!.colors)).toEqual(FULL_TEMPLATE.paletteColors);

    expect(metadata.category).toBe('character');
    expect(metadata.perspective).toEqual(getPerspective('isometric'));
    expect(metadata.resolution).toEqual({ preset: 'custom', width: 16, height: 24 });
  });

  it('defaults missing optional fields to a single layer and the standard palette', () => {
    const { document, metadata } = instantiateTemplate(MINIMAL_TEMPLATE);

    expect(document.layers.count).toBe(1);
    expect(document.palettes).toHaveLength(1);
    expect(document.palettes[0]!.colors.length).toBeGreaterThan(0); // the standard default palette

    expect(metadata.category).toBe('item');
    expect(metadata.perspective).toEqual(getPerspective('side_view'));
    expect(metadata.resolution).toEqual({ preset: '8x8', width: 8, height: 8 });
  });

  it('falls back to documented defaults for an undefined (unknown-id) template', () => {
    const withoutTemplate = instantiateTemplate(undefined);
    const documentedDefault = inferAssetMetadata(withoutTemplate.document);

    expect(withoutTemplate.document.dimensions).toEqual({ width: 32, height: 32 });
    expect(withoutTemplate.document.layers.count).toBe(1);
    expect(withoutTemplate.metadata).toEqual(documentedDefault);
  });

  it('a registry lookup miss composes with instantiateTemplate without throwing', () => {
    const registry = new TemplateRegistry(SEED_TEMPLATES);
    const missing = registry.get('does-not-exist');
    expect(missing).toBeUndefined();
    expect(() => instantiateTemplate(missing)).not.toThrow();
  });
});

describe('TemplateRegistry (V2 coding-phases Phase 2)', () => {
  it('registers, retrieves, lists, and filters by category', () => {
    const registry = new TemplateRegistry(SEED_TEMPLATES);
    expect(registry.list()).toHaveLength(SEED_TEMPLATES.length);
    expect(registry.get('character-hero')?.name).toBe('Hero');
    expect(registry.listByCategory('terrain').every((t) => t.category === 'terrain')).toBe(true);
    expect(registry.listByCategory('vehicle')).toHaveLength(0); // no seed template for this category
  });

  it('register() overwrites an existing id rather than duplicating it', () => {
    const registry = new TemplateRegistry();
    registry.register(MINIMAL_TEMPLATE);
    registry.register({ ...MINIMAL_TEMPLATE, name: 'Replaced' });
    expect(registry.list()).toHaveLength(1);
    expect(registry.get(MINIMAL_TEMPLATE.id)?.name).toBe('Replaced');
  });
});

describe('seed templates (V2 coding-phases Phase 2)', () => {
  it('every seed template instantiates successfully and covers every major category', () => {
    const registry = createSeedTemplateRegistry();
    const categoriesSeen = new Set<string>();
    for (const template of registry.list()) {
      const { document, metadata } = instantiateTemplate(template);
      expect(document.dimensions.width).toBeGreaterThan(0);
      expect(metadata.category).toBe(template.category);
      categoriesSeen.add(template.category);
    }
    // Tree and Chest share the 'object' category on purpose (Phase 7: two
    // worked examples of the variant/state pattern), so there are more
    // templates than distinct categories.
    expect(categoriesSeen).toEqual(
      new Set(['terrain', 'character', 'object', 'item', 'building', 'effect']),
    );
  });

  it('the effect template overrides the default palette', () => {
    const template = createSeedTemplateRegistry().get('effect-spark')!;
    const { document } = instantiateTemplate(template);
    expect(document.palettes).toHaveLength(1);
    expect(
      rgbaEquals(document.palettes[0]!.colors[0]!.rgba, { r: 255, g: 255, b: 255, a: 255 }),
    ).toBe(true);
  });
});

describe('instantiateTemplate + ProjectStyle (V2 coding-phases Phase 4)', () => {
  const STYLE: ProjectStyle = {
    primaryPalette: [
      { r: 1, g: 2, b: 3, a: 255 },
      { r: 4, g: 5, b: 6, a: 255 },
    ],
    secondaryPalette: [{ r: 200, g: 200, b: 200, a: 255 }],
    outlineColor: { r: 0, g: 0, b: 0, a: 255 },
    highlightColor: { r: 255, g: 255, b: 255, a: 255 },
    shadowColor: { r: 50, g: 50, b: 50, a: 255 },
    lightingDirection: 'down_left',
  };

  it("a template's own palette wins over the Project style's primary palette", () => {
    const { document } = instantiateTemplate(FULL_TEMPLATE, { style: STYLE });
    const colors = paletteRgbas(document.palettes[0]!.colors);
    // the template's own colours come first; style reference colours are appended after
    expect(colors.slice(0, FULL_TEMPLATE.paletteColors!.length)).toEqual(
      FULL_TEMPLATE.paletteColors,
    );
  });

  it("falls back to the Project style's primary palette when the template has none", () => {
    const { document } = instantiateTemplate(MINIMAL_TEMPLATE, { style: STYLE });
    expect(document.palettes).toHaveLength(2); // primary (active) + secondary
    const colors = paletteRgbas(document.palettes[0]!.colors);
    expect(colors.slice(0, STYLE.primaryPalette!.length)).toEqual(STYLE.primaryPalette);
  });

  it('adds the secondary palette without activating it', () => {
    const { document } = instantiateTemplate(MINIMAL_TEMPLATE, { style: STYLE });
    const secondary = document.palettes[1]!;
    expect(paletteRgbas(secondary.colors)).toEqual(STYLE.secondaryPalette);
    expect(document.activePaletteId).not.toBe(secondary.id);
  });

  it('adds outline/highlight/shadow reference colours to the active palette', () => {
    const { document } = instantiateTemplate(MINIMAL_TEMPLATE, { style: STYLE });
    const names = document.palettes[0]!.colors.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['Outline', 'Highlight', 'Shadow']));
  });

  it('does not duplicate a reference colour already present in the palette', () => {
    const template: Template = { ...MINIMAL_TEMPLATE, paletteColors: [STYLE.outlineColor!] };
    const { document } = instantiateTemplate(template, { style: STYLE });
    const matches = document.palettes[0]!.colors.filter((c) =>
      rgbaEquals(c.rgba, STYLE.outlineColor!),
    );
    expect(matches).toHaveLength(1);
  });

  it("overrides the resulting perspective's shadow direction with the Project style's lighting direction", () => {
    const { metadata } = instantiateTemplate(FULL_TEMPLATE, { style: STYLE });
    expect(metadata.perspective.shadowDirection).toBe('down_left');
    expect(metadata.perspective.kind).toBe('isometric'); // the template's own perspective choice stands
  });

  it('a null/absent style leaves instantiation exactly as it was in Phase 2', () => {
    const withNull = instantiateTemplate(MINIMAL_TEMPLATE, { style: null });
    const withoutOption = instantiateTemplate(MINIMAL_TEMPLATE);
    expect(withNull.document.palettes).toHaveLength(1);
    expect(withNull.metadata).toEqual(withoutOption.metadata);
  });
});

describe('instantiateTemplate + terrain tile roles (V2 coding-phases Phase 5)', () => {
  const TERRAIN_TEMPLATE: Template = {
    id: 'test-terrain',
    name: 'Test Terrain',
    category: 'terrain',
    assetType: 'grass',
    perspective: 'top_down',
    canvasSize: { width: 16, height: 16 },
    layerNames: ['Terrain'],
    tileRoles: TERRAIN_TILE_ROLES,
  };

  it('creates one independent Frame per tile role, in order', () => {
    const { document } = instantiateTemplate(TERRAIN_TEMPLATE);
    expect(document.timeline.frames).toHaveLength(TERRAIN_TILE_ROLES.length);
  });

  it('every tile-role frame starts blank and independent of the others', () => {
    const { document } = instantiateTemplate(TERRAIN_TEMPLATE);
    const layerId = document.layers.activeLayerId;
    const frames = document.timeline.frames;

    // draw on the "center" frame only, then confirm no other frame changed
    const centerIndex = TERRAIN_TILE_ROLES.indexOf('center');
    document.timeline.setActiveFrame(frames[centerIndex]!.id);
    document.ensureDrawableBuffer(layerId).setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });

    for (const [index, frame] of frames.entries()) {
      const buffer = document.resolveBuffer(layerId, frame.id);
      const pixel = buffer?.getPixel(0, 0) ?? TRANSPARENT;
      if (index === centerIndex) {
        expect(rgbaEquals(pixel, { r: 255, g: 0, b: 0, a: 255 })).toBe(true);
      } else {
        expect(rgbaEquals(pixel, TRANSPARENT)).toBe(true);
      }
    }
  });

  it('records the role -> frameIndex mapping on the resulting metadata', () => {
    const { metadata } = instantiateTemplate(TERRAIN_TEMPLATE);
    expect(metadata.terrainRoles).toHaveLength(TERRAIN_TILE_ROLES.length);
    expect(metadata.terrainRoles).toEqual(
      TERRAIN_TILE_ROLES.map((role, frameIndex) => ({ role, frameIndex })),
    );
  });

  it('a template with no tileRoles produces no terrainRoles metadata (same as Phase 2)', () => {
    const { document, metadata } = instantiateTemplate(MINIMAL_TEMPLATE);
    expect(document.timeline.frames).toHaveLength(1);
    expect(metadata.terrainRoles).toBeUndefined();
  });

  it('the grass seed template is a full 9-role terrain set', () => {
    const template = createSeedTemplateRegistry().get('terrain-grass-tile')!;
    const { document, metadata } = instantiateTemplate(template);
    expect(document.timeline.frames).toHaveLength(9);
    expect(metadata.terrainRoles?.map((slot) => slot.role)).toEqual(TERRAIN_TILE_ROLES);
  });
});

describe('instantiateTemplate + character views/states (V2 coding-phases Phase 6)', () => {
  const CHARACTER_TEMPLATE_FIXTURE: Template = {
    id: 'test-character',
    name: 'Test Character',
    category: 'character',
    assetType: 'test',
    perspective: 'three_quarter_top_down',
    canvasSize: { width: 16, height: 16 },
    layerNames: ['Body'],
    views: ['front', 'side', 'back'],
    animationStates: ['idle', 'walk'],
    headHeightRatio: 0.3,
  };

  it('creates one independent Frame per view, in order', () => {
    const { document, metadata } = instantiateTemplate(CHARACTER_TEMPLATE_FIXTURE);
    expect(document.timeline.frames).toHaveLength(3);
    expect(metadata.characterViews).toEqual([
      { view: 'front', frameIndex: 0 },
      { view: 'side', frameIndex: 1 },
      { view: 'back', frameIndex: 2 },
    ]);
  });

  it('every view frame starts blank and independent of the others', () => {
    const { document } = instantiateTemplate(CHARACTER_TEMPLATE_FIXTURE);
    const layerId = document.layers.activeLayerId;
    const frames = document.timeline.frames;

    document.timeline.setActiveFrame(frames[1]!.id); // 'side'
    document.ensureDrawableBuffer(layerId).setPixel(0, 0, { r: 0, g: 255, b: 0, a: 255 });

    for (const [index, frame] of frames.entries()) {
      const pixel = document.resolveBuffer(layerId, frame.id)?.getPixel(0, 0) ?? TRANSPARENT;
      if (index === 1) {
        expect(rgbaEquals(pixel, { r: 0, g: 255, b: 0, a: 255 })).toBe(true);
      } else {
        expect(rgbaEquals(pixel, TRANSPARENT)).toBe(true);
      }
    }
  });

  it('records the declared animationStates checklist and headHeightRatio, and the source templateId', () => {
    const { metadata } = instantiateTemplate(CHARACTER_TEMPLATE_FIXTURE);
    expect(metadata.animationStates).toEqual(['idle', 'walk']);
    expect(metadata.headHeightRatio).toBe(0.3);
    expect(metadata.templateId).toBe('test-character');
  });

  it('does not add animationStates/headHeightRatio/characterViews when the template omits them', () => {
    const { metadata } = instantiateTemplate(MINIMAL_TEMPLATE);
    expect(metadata.animationStates).toBeUndefined();
    expect(metadata.headHeightRatio).toBeUndefined();
    expect(metadata.characterViews).toBeUndefined();
    expect(metadata.templateId).toBe(MINIMAL_TEMPLATE.id); // templateId is set for any known template
  });

  it('an undefined template (unknown id) sets no templateId at all', () => {
    const { metadata } = instantiateTemplate(undefined);
    expect(metadata.templateId).toBeUndefined();
  });

  it('two characters from the same template share views, palette, and frame dimensions', () => {
    const first = instantiateTemplate(CHARACTER_TEMPLATE_FIXTURE);
    const second = instantiateTemplate(CHARACTER_TEMPLATE_FIXTURE);

    expect(second.document.dimensions).toEqual(first.document.dimensions);
    expect(second.metadata.headHeightRatio).toBe(first.metadata.headHeightRatio);
    expect(second.metadata.characterViews).toEqual(first.metadata.characterViews);
    expect(paletteRgbas(second.document.palettes[0]!.colors)).toEqual(
      paletteRgbas(first.document.palettes[0]!.colors),
    );
  });

  it('the Hero seed template is a full 3-view, 6-state character', () => {
    const template = createSeedTemplateRegistry().get('character-hero')!;
    const { document, metadata } = instantiateTemplate(template);
    expect(document.timeline.frames).toHaveLength(4); // front, back, side, three_quarter
    expect(metadata.characterViews).toHaveLength(4);
    expect(metadata.animationStates).toEqual(['idle', 'walk', 'run', 'attack', 'hurt', 'death']);
    expect(metadata.headHeightRatio).toBe(0.25);
  });
});

describe('instantiateTemplate + object variants (V2 coding-phases Phase 7)', () => {
  it('records the declared variant list as objectVariants, no frames added', () => {
    const template: Template = { ...MINIMAL_TEMPLATE, variants: ['small', 'medium', 'large'] };
    const { document, metadata } = instantiateTemplate(template);
    expect(document.timeline.frames).toHaveLength(1); // unlike tileRoles/views, no auto-generated frames
    expect(metadata.objectVariants).toEqual(['small', 'medium', 'large']);
  });

  it('omits objectVariants when the template declares none, same as Phase 2', () => {
    const { metadata } = instantiateTemplate(MINIMAL_TEMPLATE);
    expect(metadata.objectVariants).toBeUndefined();
  });

  it('the Tree and Chest seed templates declare their variant/state lists', () => {
    const registry = createSeedTemplateRegistry();
    const tree = instantiateTemplate(registry.get('object-tree'));
    expect(tree.metadata.objectVariants).toEqual(['small', 'medium', 'large']);

    const chest = instantiateTemplate(registry.get('object-chest'));
    expect(chest.metadata.objectVariants).toEqual(['closed', 'open', 'damaged']);
  });
});
