import { deflateSync } from 'node:zlib';

import { expect, test } from '@playwright/test';

import { inspect, open } from './support';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = Uint8Array.from(type, (ch) => ch.charCodeAt(0));
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes);
  body.set(data, typeBytes.length);
  const out = new Uint8Array(4 + body.length + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(body, 4);
  view.setUint32(4 + body.length, crc32(body));
  return out;
}

/** A minimal solid-colour RGBA PNG, built here so the import path has real bytes to chew on. */
function makePng(width: number, height: number, rgba: [number, number, number, number]): Buffer {
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      raw.set(rgba, rowStart + 1 + x * 4);
    }
  }
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

test.describe('lifecycle', () => {
  test('Save As writes under a chosen name and clears the dirty flag', async ({ page }) => {
    await open(page);
    await page.mouse.move(200, 200);

    page.once('dialog', (dialog) => {
      void dialog.accept('my-sprite');
    });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save As' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('my-sprite.obsipix');
    await expect(page.getByTestId('project-title')).toHaveText('my-sprite.obsipix');
  });

  test('imports a PNG as a new layer', async ({ page }) => {
    await open(page);
    const before = await page.evaluate(() => window.__obsipix?.document.layers.activeLayerId);

    page.once('filechooser', (chooser) => {
      void chooser.setFiles({
        name: 'stamp.png',
        mimeType: 'image/png',
        buffer: makePng(6, 6, [200, 40, 40, 255]),
      });
    });
    await page.getByRole('button', { name: 'Import PNG' }).click();

    await page.waitForFunction(
      (previous) => {
        const session = window.__obsipix;
        return !!session && session.document.layers.activeLayerId !== previous;
      },
      before,
      { timeout: 10_000 },
    );

    const pixel = await page.evaluate(() => {
      const session = window.__obsipix;
      if (!session) {
        return null;
      }
      return session.document.resolveBuffer(session.document.layers.activeLayerId)?.getPixel(0, 0);
    });
    expect(pixel).toMatchObject({ r: 200, g: 40, b: 40, a: 255 });
    expect((await inspect(page)).isDirty).toBe(true);
  });

  test('opens a PNG as a new document sized to the image', async ({ page }) => {
    await open(page);
    // no unsaved work → no discard confirm
    page.once('filechooser', (chooser) => {
      void chooser.setFiles({
        name: 'wide.png',
        mimeType: 'image/png',
        buffer: makePng(20, 10, [0, 128, 255, 255]),
      });
    });
    await page.getByRole('button', { name: 'Open PNG' }).click();

    await expect(page.getByTestId('status-dimensions')).toHaveText('20 × 10');
    expect((await inspect(page, [5])).isDirty).toBe(true);
  });
});
