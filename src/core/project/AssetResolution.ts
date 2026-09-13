import type { Dimensions } from '@core/types/geometry';

/** Named resolution presets (V2 vision doc §3). `custom` covers everything else. */
export const RESOLUTION_PRESETS = ['8x8', '16x16', '32x32', '48x48', '64x64', 'custom'] as const;

export type ResolutionPreset = (typeof RESOLUTION_PRESETS)[number];

export interface AssetResolution extends Dimensions {
  readonly preset: ResolutionPreset;
}

const KNOWN_SQUARE_PRESETS: Readonly<Record<number, ResolutionPreset>> = {
  8: '8x8',
  16: '16x16',
  32: '32x32',
  48: '48x48',
  64: '64x64',
};

/** Classify a Document's pixel dimensions into a named resolution preset, or `custom`. */
export function resolutionFromDimensions(dimensions: Dimensions): AssetResolution {
  const preset =
    dimensions.width === dimensions.height
      ? (KNOWN_SQUARE_PRESETS[dimensions.width] ?? 'custom')
      : 'custom';
  return { preset, width: dimensions.width, height: dimensions.height };
}

export function isResolutionPreset(value: unknown): value is ResolutionPreset {
  return typeof value === 'string' && (RESOLUTION_PRESETS as readonly string[]).includes(value);
}
