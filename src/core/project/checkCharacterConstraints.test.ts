import { describe, expect, it } from 'vitest';

import { checkCharacterConstraints } from './checkCharacterConstraints';
import { instantiateTemplate } from './instantiateTemplate';
import type { CharacterTemplate } from './Template';

const TEMPLATE: CharacterTemplate = {
  id: 'test-character',
  name: 'Test Character',
  category: 'character',
  assetType: 'test',
  perspective: 'three_quarter_top_down',
  canvasSize: { width: 16, height: 16 },
  layerNames: ['Body'],
  views: ['front', 'side'],
  animationStates: ['idle'],
  headHeightRatio: 0.3,
  paletteColors: [
    { r: 10, g: 20, b: 30, a: 255 },
    { r: 40, g: 50, b: 60, a: 255 },
  ],
};

describe('checkCharacterConstraints (V2 coding-phases Phase 6)', () => {
  it('a freshly-instantiated character has no violations against its own template', () => {
    const { document, metadata } = instantiateTemplate(TEMPLATE);
    expect(checkCharacterConstraints(document, metadata, TEMPLATE)).toEqual([]);
  });

  it('flags a sprite-dimensions mismatch', () => {
    const { document, metadata } = instantiateTemplate({
      ...TEMPLATE,
      canvasSize: { width: 32, height: 32 },
    });
    const violations = checkCharacterConstraints(document, metadata, TEMPLATE);
    expect(violations.map((v) => v.field)).toContain('spriteDimensions');
  });

  it('flags a headHeightRatio mismatch', () => {
    const { document, metadata } = instantiateTemplate({ ...TEMPLATE, headHeightRatio: 0.5 });
    const violations = checkCharacterConstraints(document, metadata, TEMPLATE);
    expect(violations.map((v) => v.field)).toContain('headHeightRatio');
  });

  it('flags a missing headHeightRatio (e.g. metadata from before this template existed)', () => {
    const { document, metadata } = instantiateTemplate(undefined);
    const violations = checkCharacterConstraints(document, metadata, TEMPLATE);
    expect(violations.map((v) => v.field)).toContain('headHeightRatio');
  });

  it('flags a palette that has drifted from the template', () => {
    const { document, metadata } = instantiateTemplate(TEMPLATE);
    const paletteId = document.activePaletteId!;
    document.removePalette(paletteId);
    document.createPalette('Drifted', [{ r: 1, g: 1, b: 1, a: 255 }]);

    const violations = checkCharacterConstraints(document, metadata, TEMPLATE);
    expect(violations.map((v) => v.field)).toContain('palette');
  });

  it('does not flag the palette when the template declares none', () => {
    const { paletteColors: _drop, ...rest } = TEMPLATE;
    const templateWithoutPalette: CharacterTemplate = rest;
    const { document, metadata } = instantiateTemplate(templateWithoutPalette);
    const violations = checkCharacterConstraints(document, metadata, templateWithoutPalette);
    expect(violations.map((v) => v.field)).not.toContain('palette');
  });

  it('reports multiple violations at once', () => {
    const { document, metadata } = instantiateTemplate({
      ...TEMPLATE,
      canvasSize: { width: 8, height: 8 },
      headHeightRatio: 0.9,
    });
    const violations = checkCharacterConstraints(document, metadata, TEMPLATE);
    expect(violations.map((v) => v.field).sort()).toEqual(['headHeightRatio', 'spriteDimensions']);
  });
});
