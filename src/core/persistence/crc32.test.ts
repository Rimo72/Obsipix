import { describe, expect, it } from 'vitest';

import { crc32 } from './crc32';

describe('crc32', () => {
  it('matches known test vectors', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new TextEncoder().encode('The quick brown fox jumps over the lazy dog'))).toBe(
      0x414fa339,
    );
  });

  it('changes when a single byte changes', () => {
    const a = new TextEncoder().encode('obsipix');
    const b = new TextEncoder().encode('obsipiy');
    expect(crc32(a)).not.toBe(crc32(b));
  });
});
