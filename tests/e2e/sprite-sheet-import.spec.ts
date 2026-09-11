import { deflateSync } from 'node:zlib';

import { expect, test } from '@playwright/test';

import { inspect, menuAction, open, pixelAt } from './support';

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

type Rgba = [number, number, number, number];

/** A PNG whose pixel `(x, y)` is `paint(x, y)`. */
function makePng(width: number, height: number, paint: (x: number, y: number) => Rgba): Buffer {
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      raw.set(paint(x, y), rowStart + 1 + x * 4);
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

const RED: Rgba = [220, 40, 40, 255];
const BLUE: Rgba = [40, 40, 220, 255];

test.describe('sprite sheet PNG import', () => {
  test('splits a 64×32 sheet into two 32×32 frames', async ({ page }) => {
    await open(page);

    page.once('filechooser', (chooser) => {
      void chooser.setFiles({
        name: 'walk.png',
        mimeType: 'image/png',
        buffer: makePng(64, 32, (x) => (x < 32 ? RED : BLUE)),
      });
    });
    await menuAction(page, 'File', 'Open PNG…');

    const dialog = page.getByRole('dialog', { name: 'Open PNG' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('radio', { name: 'Sprite sheet' }).click();
    await expect(dialog.getByTestId('import-detected')).toContainText('2 frames');
    await dialog.getByRole('button', { name: 'Import' }).click();

    await expect(page.getByTestId('status-dimensions')).toHaveText('32 × 32');

    const frameCount = await page.evaluate(() => window.__obsipix?.document.timeline.frameCount);
    expect(frameCount).toBe(2);

    const frameIds = await page.evaluate(() =>
      window.__obsipix?.document.timeline.frames.map((frame) => frame.id),
    );
    expect(frameIds).toHaveLength(2);

    expect(await pixelAt(page, 5, 5, { frameId: frameIds![0] })).toMatchObject({
      r: 220,
      g: 40,
      b: 40,
      a: 255,
    });
    expect(await pixelAt(page, 5, 5, { frameId: frameIds![1] })).toMatchObject({
      r: 40,
      g: 40,
      b: 220,
      a: 255,
    });
    expect((await inspect(page, [5])).isDirty).toBe(true);
  });

  test('the config fields stay inside the sidebar and never overlap the preview', async ({
    page,
  }) => {
    await open(page);

    page.once('filechooser', (chooser) => {
      void chooser.setFiles({
        name: 'sheet.png',
        mimeType: 'image/png',
        buffer: makePng(64, 32, () => RED),
      });
    });
    await menuAction(page, 'File', 'Open PNG…');

    const dialog = page.getByRole('dialog', { name: 'Open PNG' });
    await dialog.getByRole('radio', { name: 'Sprite sheet' }).click();

    const frameHeight = dialog.getByLabel('Frame height');
    const offsetY = dialog.getByLabel('Offset Y');
    const preview = dialog.getByTestId('import-png-viewport');
    const [fieldBox, offsetBox, previewBox] = await Promise.all([
      frameHeight.boundingBox(),
      offsetY.boundingBox(),
      preview.boundingBox(),
    ]);
    expect(fieldBox).not.toBeNull();
    expect(offsetBox).not.toBeNull();
    expect(previewBox).not.toBeNull();
    // the second (right) column of number fields must end before the preview
    // pane starts, never spill into it
    expect(fieldBox!.x + fieldBox!.width).toBeLessThanOrEqual(previewBox!.x);
    expect(offsetBox!.x + offsetBox!.width).toBeLessThanOrEqual(previewBox!.x);
  });

  test('the preview identifies the frame under the pointer and zooms in', async ({ page }) => {
    await open(page);

    page.once('filechooser', (chooser) => {
      void chooser.setFiles({
        name: 'walk.png',
        mimeType: 'image/png',
        buffer: makePng(64, 32, (x) => (x < 32 ? RED : BLUE)),
      });
    });
    await menuAction(page, 'File', 'Open PNG…');

    const dialog = page.getByRole('dialog', { name: 'Open PNG' });
    await dialog.getByRole('radio', { name: 'Sprite sheet' }).click();
    await dialog.getByLabel('Frame width').fill('32');
    await dialog.getByLabel('Frame height').fill('32');

    const hover = dialog.getByTestId('import-hover');
    await expect(hover).toHaveText('Hover the preview to identify a frame.');

    // Pin the preview to an exact 1 image-pixel : 1 CSS-pixel scale.
    await dialog.getByRole('button', { name: '1×' }).click();
    const surface = dialog.getByTestId('import-png-surface');
    await expect(surface).toHaveCSS('width', '64px');

    await surface.hover({ position: { x: 10, y: 10 } });
    await expect(hover).toHaveText('Hovering frame 1 — column 1, row 1');

    await surface.hover({ position: { x: 40, y: 10 } });
    await expect(hover).toHaveText('Hovering frame 2 — column 2, row 1');

    await dialog.getByRole('button', { name: 'Cancel' }).hover();
    await expect(hover).toHaveText('Hover the preview to identify a frame.');
  });

  test('refuses a frame size that would drop pixels', async ({ page }) => {
    await open(page);

    page.once('filechooser', (chooser) => {
      void chooser.setFiles({
        name: 'sheet.png',
        mimeType: 'image/png',
        buffer: makePng(64, 32, () => RED),
      });
    });
    await menuAction(page, 'File', 'Open PNG…');

    const dialog = page.getByRole('dialog', { name: 'Open PNG' });
    await dialog.getByRole('radio', { name: 'Sprite sheet' }).click();
    await dialog.getByLabel('Frame width').fill('30');

    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Import' })).toBeDisabled();
  });
});
