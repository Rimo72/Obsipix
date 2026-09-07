import { describe, expect, it } from 'vitest';

import { createDefaultDocument } from '@core/document/DocumentFactory';
import { createSequentialIdFactory } from '@core/document/IdFactory';
import { PixelBuffer } from '@core/pixels/PixelBuffer';
import { WHITE } from '@core/types/color';

import { paintFrame, paintPixelBuffer } from './framePaint';

/**
 * jsdom has no 2D canvas context, so these only assert the functions stay on
 * their graceful "no context" path — real rendering is covered by the e2e specs.
 */
describe('framePaint', () => {
  it('does nothing and does not throw when a 2D context is unavailable', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    expect(() => {
      paintPixelBuffer(canvas, PixelBuffer.create(8, 8), 'checkerboard');
    }).not.toThrow();
    expect(() => {
      paintFrame(canvas, createDefaultDocument(createSequentialIdFactory()), undefined, WHITE);
    }).not.toThrow();
  });
});
