import { rgba, type RGBA } from '@core/types/color';

function hex(value: string): RGBA {
  return rgba(
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  );
}

/** The default 16-colour palette a new document ships with (PICO-8). */
export const DEFAULT_PALETTE_NAME = 'PICO-8';

export const DEFAULT_PALETTE_COLORS: readonly RGBA[] = [
  '000000',
  '1d2b53',
  '7e2553',
  '008751',
  'ab5236',
  '5f574f',
  'c2c3c7',
  'fff1e8',
  'ff004d',
  'ffa300',
  'ffec27',
  '00e436',
  '29adff',
  '83769c',
  'ff77a8',
  'ffccaa',
].map(hex);
