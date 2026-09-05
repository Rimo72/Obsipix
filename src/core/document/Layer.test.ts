import { describe, expect, it } from 'vitest';

import type { LayerId } from '@core/types/ids';

import { Layer } from './Layer';

const id = 'lyr_test' as LayerId;

describe('Layer', () => {
  it('applies defaults for visibility, lock and opacity', () => {
    const layer = new Layer(id, { name: 'Base' });
    expect(layer.name).toBe('Base');
    expect(layer.visible).toBe(true);
    expect(layer.locked).toBe(false);
    expect(layer.opacity).toBe(1);
  });

  it('mutates through its setters', () => {
    const layer = new Layer(id, { name: 'Base' });
    layer.rename('Sky');
    layer.setVisible(false);
    layer.setLocked(true);
    layer.setOpacity(0.25);
    expect(layer.name).toBe('Sky');
    expect(layer.visible).toBe(false);
    expect(layer.locked).toBe(true);
    expect(layer.opacity).toBe(0.25);
  });

  it.each([-0.1, 1.1, Number.NaN])('rejects opacity %s', (value) => {
    const layer = new Layer(id, { name: 'Base' });
    expect(() => {
      layer.setOpacity(value);
    }).toThrow(RangeError);
    expect(() => new Layer(id, { name: 'Base', opacity: value })).toThrow(RangeError);
  });

  it('clones to an independent copy with the same id', () => {
    const layer = new Layer(id, { name: 'Base', opacity: 0.5 });
    const copy = layer.clone();
    copy.rename('Changed');
    expect(copy.id).toBe(layer.id);
    expect(layer.name).toBe('Base');
    expect(copy.opacity).toBe(0.5);
  });
});
