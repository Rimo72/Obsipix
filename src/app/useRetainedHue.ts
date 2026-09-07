import { useEffect, useState } from 'react';

import { rgbToHsl, rgbToHsv, type HSL, type HSV } from '@core/colors/convert';
import type { RGBA } from '@core/types/color';

const isGrey = (c: RGBA): boolean => c.r === c.g && c.g === c.b;

/**
 * Hue is undefined for greys and black, where RGB carries no hue information
 * (PROJECT_CORE §14.2 "achromatic hue retention"). This hook keeps the user's
 * last chosen hue so dragging value / saturation away from grey does not snap
 * the hue back to 0°. Hue is re-derived from RGB only for chromatic colours.
 */
export function useRetainedHue(value: RGBA): {
  hue: number;
  setHue: (h: number) => void;
  hsv: HSV;
  hsl: HSL;
} {
  const rgb = { r: value.r, g: value.g, b: value.b };
  const [hue, setHue] = useState(() => rgbToHsv(rgb).h);

  useEffect(() => {
    if (!isGrey(value)) {
      setHue(rgbToHsv({ r: value.r, g: value.g, b: value.b }).h);
    }
  }, [value]);

  return {
    hue,
    setHue,
    hsv: { ...rgbToHsv(rgb), h: hue },
    hsl: { ...rgbToHsl(rgb), h: hue },
  };
}
