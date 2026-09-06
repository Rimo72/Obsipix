import type { PixelPoint } from '@core/types/geometry';

export type PointerSource = 'mouse' | 'pen' | 'touch';

export interface PointerButtons {
  readonly left: boolean;
  readonly right: boolean;
  readonly middle: boolean;
}

export interface PointerModifiers {
  readonly shift: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly meta: boolean;
}

/**
 * A pointer event after it has crossed the input boundary (PROJECT_CORE §12).
 *
 * Tools receive this, never a browser `PointerEvent`. `canvas` is in canvas CSS
 * pixels; `pixel` is the document pixel it lands on (already floored — it may be
 * outside the document).
 */
export interface PointerInput {
  readonly canvas: { readonly x: number; readonly y: number };
  readonly pixel: PixelPoint;
  readonly source: PointerSource;
  readonly buttons: PointerButtons;
  readonly modifiers: PointerModifiers;
  /** 0..1 where reported; 1 for devices without pressure. */
  readonly pressure: number;
}

export const NO_BUTTONS: PointerButtons = { left: false, right: false, middle: false };
export const NO_MODIFIERS: PointerModifiers = {
  shift: false,
  ctrl: false,
  alt: false,
  meta: false,
};
