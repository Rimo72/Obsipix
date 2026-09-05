/**
 * Primitive identity types.
 *
 * IDs are opaque branded primitives so that, for example, a {@link LayerId}
 * can never be passed where a {@link FrameId} is expected. Array position
 * represents ordering, never identity (PROJECT_CORE §8.5).
 *
 * Phase 1 defines the types only. ID generation arrives with the Document
 * model in Phase 2.
 */

declare const brand: unique symbol;

export type Brand<Base, Tag extends string> = Base & { readonly [brand]: Tag };

export type DocumentId = Brand<string, 'DocumentId'>;
export type LayerId = Brand<string, 'LayerId'>;
export type FrameId = Brand<string, 'FrameId'>;
export type CelId = Brand<string, 'CelId'>;
export type PaletteId = Brand<string, 'PaletteId'>;
export type AnimationTagId = Brand<string, 'AnimationTagId'>;

/** Zero-based position of a frame in the timeline. Ordering, not identity. */
export type FrameIndex = Brand<number, 'FrameIndex'>;

/** Monotonic document revision counter (PROJECT_CORE §8.7). */
export type Revision = Brand<number, 'Revision'>;
