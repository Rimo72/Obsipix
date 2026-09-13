/**
 * Character views (V2 vision doc §7). Each declared view becomes one Frame
 * at instantiation, the same pattern Phase 5 uses for terrain tile roles —
 * a character template's views are a flat set of independent static poses,
 * not a spatial grid like terrain's, so a linear list is the natural shape.
 */
export const CHARACTER_VIEWS = ['front', 'back', 'side', 'three_quarter', 'custom'] as const;

export type CharacterView = (typeof CHARACTER_VIEWS)[number];

export function isCharacterView(value: unknown): value is CharacterView {
  return typeof value === 'string' && (CHARACTER_VIEWS as readonly string[]).includes(value);
}
