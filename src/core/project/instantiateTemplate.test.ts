import { describe, expect, it } from 'vitest';

import { createSequentialIdFactory } from '@core/document/IdFactory';
import { rgbaEquals, type RGBA } from '@core/types/color';

import { inferAssetMetadata } from './AssetMetadata';
import { instantiateTemplate } from './instantiateTemplate';
import { getPerspective } from './Perspective';
import { SEED_TEMPLATES, createSeedTemplateRegistry } from './seedTemplates';
import type { Template } from './Template';
import { TemplateRegistry } from './TemplateRegistry';

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
    const { document, metadata } = instantiateTemplate(FULL_TEMPLATE, createSequentialIdFactory());

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
  it('every seed template instantiates successfully and covers a distinct category', () => {
    const registry = createSeedTemplateRegistry();
    const categoriesSeen = new Set<string>();
    for (const template of registry.list()) {
      const { document, metadata } = instantiateTemplate(template);
      expect(document.dimensions.width).toBeGreaterThan(0);
      expect(metadata.category).toBe(template.category);
      categoriesSeen.add(template.category);
    }
    expect(categoriesSeen.size).toBe(SEED_TEMPLATES.length); // one per major category, no overlap
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
