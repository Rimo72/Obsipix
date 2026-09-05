import { describe, expect, it } from 'vitest';

import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { BLACK, TRANSPARENT, rgbaEquals } from '@core/types/color';
import type { CelId } from '@core/types/ids';

import { Cel } from './Cel';

const celId = (n: number): CelId => `cel_${String(n)}` as CelId;

describe('Cel kinds', () => {
  it('normal cel owns a buffer', () => {
    const cel = Cel.normal(celId(1), PixelBuffer.create(4, 4));
    expect(cel.type).toBe('normal');
    expect(cel.buffer).not.toBeNull();
  });

  it('empty cel has no buffer and is distinct from a transparent normal cel', () => {
    const empty = Cel.empty(celId(1));
    const transparentNormal = Cel.normal(celId(2), PixelBuffer.create(4, 4));
    expect(empty.isEmpty).toBe(true);
    expect(empty.buffer).toBeNull();
    expect(transparentNormal.isEmpty).toBe(false);
  });

  it('hold cel has no buffer of its own', () => {
    const cel = Cel.hold(celId(1));
    expect(cel.isHold).toBe(true);
    expect(cel.buffer).toBeNull();
  });
});

describe('linked cels', () => {
  it('share the same buffer instance, so an edit is visible through both', () => {
    const shared = PixelBuffer.create(4, 4);
    const source = Cel.normal(celId(1), shared);
    const linked = Cel.linked(celId(2), shared);

    expect(linked.isLinked).toBe(true);
    expect(linked.sharesBufferWith(source)).toBe(true);

    linked.requireBuffer().setPixel(1, 1, BLACK);
    expect(rgbaEquals(source.requireBuffer().getPixel(1, 1), BLACK)).toBe(true);
  });
});

describe('Cel.makeUnique', () => {
  it('copies the shared buffer and turns the cel normal', () => {
    const shared = PixelBuffer.create(4, 4);
    shared.setPixel(0, 0, BLACK);
    const source = Cel.normal(celId(1), shared);
    const linked = Cel.linked(celId(2), shared);

    linked.makeUnique();

    expect(linked.type).toBe('normal');
    expect(linked.sharesBufferWith(source)).toBe(false);
    // the copy keeps the pixels it had at the moment of separation
    expect(rgbaEquals(linked.requireBuffer().getPixel(0, 0), BLACK)).toBe(true);
    // subsequent edits no longer cross over
    linked.requireBuffer().setPixel(2, 2, BLACK);
    expect(rgbaEquals(source.requireBuffer().getPixel(2, 2), TRANSPARENT)).toBe(true);
  });

  it('rejects Make Unique on a cel that is not linked', () => {
    const cel = Cel.normal(celId(1), PixelBuffer.create(2, 2));
    expect(() => {
      cel.makeUnique();
    }).toThrow();
  });
});

describe('Cel.clone', () => {
  it('preserves buffer sharing through a shared buffer map', () => {
    const shared = PixelBuffer.create(4, 4);
    const source = Cel.normal(celId(1), shared);
    const linked = Cel.linked(celId(2), shared);

    const map = new Map<PixelBuffer, PixelBuffer>();
    const sourceCopy = source.clone(map);
    const linkedCopy = linked.clone(map);

    expect(sourceCopy.sharesBufferWith(linkedCopy)).toBe(true);
    expect(sourceCopy.sharesBufferWith(source)).toBe(false);
  });
});
