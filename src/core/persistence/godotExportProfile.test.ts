import { describe, expect, it } from 'vitest';

import { GODOT_EXPORT_PROFILE } from './godotExportProfile';

describe('GODOT_EXPORT_PROFILE (V2 coding-phases Phase 9)', () => {
  it('widens the generic §13 schema with the sheet grid shape Godot import asks for', () => {
    const metadata = GODOT_EXPORT_PROFILE.buildMetadata({
      assetName: 'Forest Tree',
      category: 'object',
      perspective: 'top_down',
      resolutionWidth: 32,
      frameCount: 4,
      columns: 4,
      rows: 1,
      frameWidth: 32,
      frameHeight: 32,
    });

    expect(metadata).toEqual({
      asset: 'forest_tree',
      type: 'object',
      resolution: 32,
      perspective: 'top_down',
      frames: 4,
      engine: 'godot',
      columns: 4,
      rows: 1,
      frame_width: 32,
      frame_height: 32,
    });
  });

  it('reports a multi-row grid shape for a terrain tileset', () => {
    const metadata = GODOT_EXPORT_PROFILE.buildMetadata({
      assetName: 'Grass Terrain Set',
      category: 'terrain',
      perspective: 'top_down',
      resolutionWidth: 32,
      frameCount: 9,
      columns: 3,
      rows: 3,
      frameWidth: 32,
      frameHeight: 32,
    });

    expect(metadata).toMatchObject({ columns: 3, rows: 3 });
  });
});
