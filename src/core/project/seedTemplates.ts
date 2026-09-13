import type { RGBA } from '@core/types/color';

import { CHARACTER_ANIMATION_STATES } from './CharacterAnimationState';
import { CHARACTER_VIEWS } from './CharacterView';
import { TERRAIN_TILE_ROLES } from './TerrainTileRole';
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
 * full content — real object depth arrives in Phase 7. The terrain and
 * character templates are the exceptions: terrain is a full 3x3 tile-role
 * set (Phase 5) and Hero is a full view/state/proportion set (Phase 6),
 * since those are the phases that define what "full content" for each
 * means.
 */
export const SEED_TEMPLATES: readonly Template[] = [
  {
    id: 'terrain-grass-tile',
    name: 'Grass Terrain Set',
    category: 'terrain',
    assetType: 'grass-tile',
    perspective: 'top_down',
    canvasSize: { width: 32, height: 32 },
    layerNames: ['Terrain'],
    tileRoles: TERRAIN_TILE_ROLES,
  },
  {
    id: 'character-hero',
    name: 'Hero',
    category: 'character',
    assetType: 'hero',
    perspective: 'three_quarter_top_down',
    canvasSize: { width: 32, height: 32 },
    layerNames: ['Body', 'Outline'],
    views: CHARACTER_VIEWS.filter((view) => view !== 'custom'),
    animationStates: CHARACTER_ANIMATION_STATES.filter((state) => state !== 'custom'),
    headHeightRatio: 0.25,
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
