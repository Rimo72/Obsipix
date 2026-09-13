import type { RGBA } from '@core/types/color';

import type { Template } from './Template';
import { TemplateRegistry } from './TemplateRegistry';

function rgba(r: number, g: number, b: number): RGBA {
  return { r, g, b, a: 255 };
}

const EFFECT_PALETTE: readonly RGBA[] = [
  rgba(255, 255, 255),
  rgba(255, 241, 143),
  rgba(255, 184, 77),
  rgba(255, 96, 96),
];

/**
 * A handful of seed templates, one per major category, proving the
 * Template Engine end-to-end (V2 coding-phases Phase 2). Deliberately not
 * full content — real terrain/character/object depth arrives in Phases 5-7.
 */
export const SEED_TEMPLATES: readonly Template[] = [
  {
    id: 'terrain-grass-tile',
    name: 'Grass Tile',
    category: 'terrain',
    assetType: 'grass-tile',
    perspective: 'top_down',
    canvasSize: { width: 32, height: 32 },
    layerNames: ['Terrain'],
  },
  {
    id: 'character-hero',
    name: 'Hero',
    category: 'character',
    assetType: 'hero',
    perspective: 'three_quarter_top_down',
    canvasSize: { width: 32, height: 32 },
    layerNames: ['Body', 'Outline'],
  },
  {
    id: 'object-tree',
    name: 'Tree',
    category: 'object',
    assetType: 'tree',
    perspective: 'top_down',
    canvasSize: { width: 48, height: 48 },
    layerNames: ['Object'],
  },
  {
    id: 'item-potion',
    name: 'Potion',
    category: 'item',
    assetType: 'potion',
    perspective: 'top_down',
    canvasSize: { width: 16, height: 16 },
    layerNames: ['Icon'],
  },
  {
    id: 'building-house',
    name: 'House',
    category: 'building',
    assetType: 'house',
    perspective: 'three_quarter_top_down',
    canvasSize: { width: 64, height: 64 },
    layerNames: ['Structure', 'Roof'],
  },
  {
    id: 'effect-spark',
    name: 'Spark',
    category: 'effect',
    assetType: 'spark',
    perspective: 'top_down',
    canvasSize: { width: 32, height: 32 },
    layerNames: ['Effect'],
    paletteColors: EFFECT_PALETTE,
  },
];

export function createSeedTemplateRegistry(): TemplateRegistry {
  return new TemplateRegistry(SEED_TEMPLATES);
}
