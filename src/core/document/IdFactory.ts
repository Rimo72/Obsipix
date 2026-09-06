import type {
  AnimationTagId,
  CelId,
  DocumentId,
  FrameId,
  LayerId,
  PaletteColorId,
  PaletteId,
} from '@core/types/ids';

/**
 * Source of stable, unique identities for document entities.
 *
 * IDs are stable independently of array position (PROJECT_CORE §8.5). The
 * factory is injected so that tests can use a deterministic sequence.
 */
export interface IdFactory {
  document(): DocumentId;
  layer(): LayerId;
  frame(): FrameId;
  cel(): CelId;
  palette(): PaletteId;
  paletteColor(): PaletteColorId;
  animationTag(): AnimationTagId;
}

function defaultRandom(): string {
  return crypto.randomUUID();
}

/**
 * Build an {@link IdFactory}. `source` returns the unique portion of each id;
 * it defaults to `crypto.randomUUID()` (available in Node and browsers alike).
 */
export function createIdFactory(source: () => string = defaultRandom): IdFactory {
  return {
    document: () => `doc_${source()}` as DocumentId,
    layer: () => `lyr_${source()}` as LayerId,
    frame: () => `frm_${source()}` as FrameId,
    cel: () => `cel_${source()}` as CelId,
    palette: () => `pal_${source()}` as PaletteId,
    paletteColor: () => `pc_${source()}` as PaletteColorId,
    animationTag: () => `tag_${source()}` as AnimationTagId,
  };
}

/** A deterministic factory (`*_1`, `*_2`, …) for tests and fixtures. */
export function createSequentialIdFactory(): IdFactory {
  let counter = 0;
  return createIdFactory(() => {
    counter += 1;
    return String(counter);
  });
}
