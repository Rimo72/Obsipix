/**
 * Character animation states (V2 vision doc §7). Unlike terrain tile roles
 * or character views, a state's frame count is open-ended and artist-driven
 * (a walk cycle might be 4 frames, 8, or 12), so instantiation does not
 * auto-generate frames for these — they're a declared checklist the
 * Character Info panel surfaces, backed by the existing V1 AnimationTag
 * mechanism once the artist actually animates a state.
 */
export const CHARACTER_ANIMATION_STATES = [
  'idle',
  'walk',
  'run',
  'attack',
  'hurt',
  'death',
  'custom',
] as const;

export type CharacterAnimationState = (typeof CHARACTER_ANIMATION_STATES)[number];

export function isCharacterAnimationState(value: unknown): value is CharacterAnimationState {
  return (
    typeof value === 'string' && (CHARACTER_ANIMATION_STATES as readonly string[]).includes(value)
  );
}
