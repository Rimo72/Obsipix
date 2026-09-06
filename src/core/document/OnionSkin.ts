/** Onion-skin overlay settings (PROJECT_CORE §9). Never written into artwork. */
export interface OnionSkinSettings {
  enabled: boolean;
  /** How many earlier frames to show. */
  previous: number;
  /** How many later frames to show. */
  next: number;
  /** Opacity of the nearest onion frame (0..1); further frames fade further. */
  opacity: number;
}

export const DEFAULT_ONION_SKIN: OnionSkinSettings = {
  enabled: false,
  previous: 1,
  next: 1,
  opacity: 0.4,
};
