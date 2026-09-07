import { describe, expect, it } from 'vitest';

import { DocumentFactory } from '@core/document/DocumentFactory';
import { compositeDocument } from '@core/document/compositeDocument';
import { createSequentialIdFactory } from '@core/document/IdFactory';
import { drawStrokeCommand } from '@core/tools/commands';
import { History } from '@core/history/History';
import { parseDocument } from '@core/persistence/parse';
import { serializeDocument } from '@core/persistence/serialize';
import { BLACK } from '@core/types/color';

/**
 * Loose performance ceilings (PROJECT_CORE §16). These are not the product
 * targets — they are ~10× headroom so a pathological regression fails CI while
 * ordinary machine-to-machine variance does not. Numbers are logged so a real
 * measurement is always available.
 *
 * The environment is generous because CI runners and `jsdom` are slow; treat a
 * failure here as "something got structurally worse", then profile for real.
 */

function measure(label: string, fn: () => void): number {
  const start = performance.now();
  fn();
  const elapsed = performance.now() - start;
  console.info(`[perf] ${label}: ${elapsed.toFixed(1)}ms`);
  return elapsed;
}

/** A deliberately heavy but plausible V1 project: 128×128, 8 layers, 24 frames. */
function heavyDocument() {
  const document = new DocumentFactory(createSequentialIdFactory()).create({
    width: 128,
    height: 128,
  });
  for (let i = 0; i < 7; i += 1) {
    document.addLayer(`Layer ${String(i + 2)}`);
  }
  for (let f = 0; f < 23; f += 1) {
    document.addFrame();
  }
  // paint something on the active cel of every frame so buffers are non-trivial
  for (const frame of document.timeline.frames) {
    const buffer = document.timeline.ensureNormalCel(
      document.timeline.indexOf(frame.id),
      document.layers.activeLayerId,
    );
    for (let x = 0; x < 128; x += 3) {
      buffer.setPixel(x, x % 128, BLACK);
    }
  }
  return document;
}

describe('performance budgets', () => {
  it('serializes and re-parses a heavy project well under the load target', () => {
    const document = heavyDocument();
    const bytes = serializeDocument(document);
    const save = measure('serialize 128×128 / 8L / 24F', () => {
      serializeDocument(document);
    });
    const load = measure('parse 128×128 / 8L / 24F', () => {
      parseDocument(bytes, createSequentialIdFactory());
    });
    expect(save).toBeLessThan(2000);
    expect(load).toBeLessThan(2000); // product target is ~2s for a *typical* project
  });

  it('clones the document (one undo snapshot) quickly', () => {
    const document = heavyDocument();
    const elapsed = measure('Document.clone', () => {
      for (let i = 0; i < 5; i += 1) {
        document.clone();
      }
    });
    expect(elapsed).toBeLessThan(1500);
  });

  it('composites the active frame quickly', () => {
    const document = heavyDocument();
    const elapsed = measure('compositeDocument ×20', () => {
      for (let i = 0; i < 20; i += 1) {
        compositeDocument(document);
      }
    });
    expect(elapsed).toBeLessThan(1000);
  });

  it('stays responsive through many undo/redo cycles', () => {
    const history = new History(new DocumentFactory(createSequentialIdFactory()).create());
    for (let i = 0; i < 60; i += 1) {
      history.execute(drawStrokeCommand([{ x: i % 32, y: (i * 2) % 32 }], BLACK));
    }
    const elapsed = measure('undo→redo ×60', () => {
      for (let i = 0; i < 60; i += 1) {
        history.undo();
      }
      for (let i = 0; i < 60; i += 1) {
        history.redo();
      }
    });
    expect(elapsed).toBeLessThan(2000);
    expect(history.canRedo).toBe(false);
  });
});
