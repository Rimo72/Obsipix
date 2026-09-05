import { describe, expect, it } from 'vitest';

import type { LayerId } from '@core/types/ids';

import { Layer } from './Layer';
import { LayerCollection } from './LayerCollection';

function layer(name: string): Layer {
  return new Layer(`lyr_${name}` as LayerId, { name });
}

function collection(): LayerCollection {
  return new LayerCollection(layer('a'));
}

describe('LayerCollection', () => {
  it('starts with one active layer', () => {
    const layers = collection();
    expect(layers.count).toBe(1);
    expect(layers.activeLayerId).toBe('lyr_a');
  });

  it('inserts on top by default and tracks order by index', () => {
    const layers = collection();
    layers.insertAt(layer('b'));
    expect(layers.layerIds()).toEqual(['lyr_a', 'lyr_b']);
    expect(layers.indexOf('lyr_b' as LayerId)).toBe(1);
  });

  it('keeps ids stable across reordering', () => {
    const layers = collection();
    layers.insertAt(layer('b'));
    layers.insertAt(layer('c'));
    layers.move('lyr_c' as LayerId, 0);
    expect(layers.layerIds()).toEqual(['lyr_c', 'lyr_a', 'lyr_b']);
    expect(layers.get('lyr_a' as LayerId)?.name).toBe('a');
  });

  it('refuses to remove the final layer', () => {
    const layers = collection();
    expect(() => {
      layers.remove('lyr_a' as LayerId);
    }).toThrow(/last layer/);
  });

  it('moves the active pointer to a neighbour when the active layer is removed', () => {
    const layers = collection();
    layers.insertAt(layer('b'));
    layers.setActive('lyr_b' as LayerId);
    layers.remove('lyr_b' as LayerId);
    expect(layers.activeLayerId).toBe('lyr_a');
    expect(layers.count).toBe(1);
  });

  it('rejects a duplicate layer id on insert', () => {
    const layers = collection();
    expect(() => {
      layers.insertAt(layer('a'));
    }).toThrow(/already/);
  });

  it('clones to an independent collection', () => {
    const layers = collection();
    layers.insertAt(layer('b'));
    const copy = layers.clone();
    copy.get('lyr_a' as LayerId)?.rename('renamed');
    expect(layers.get('lyr_a' as LayerId)?.name).toBe('a');
    expect(copy.layerIds()).toEqual(['lyr_a', 'lyr_b']);
  });
});
