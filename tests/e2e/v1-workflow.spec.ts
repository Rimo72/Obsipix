import { inflateSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { dragPixels, menuAction, open, pixelAt } from './support';

/** Decode the subset of PNG our encoder produces (8-bit RGBA, filter 0). */
function decodePng(bytes: Buffer): {
  width: number;
  height: number;
  at: (x: number, y: number) => number[];
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < 8; i += 1) {
    expect(bytes[i]).toBe([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][i]);
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat: number[] = [];
  while (offset < bytes.length) {
    const length = view.getUint32(offset);
    const type = bytes.toString('latin1', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
    } else if (type === 'IDAT') {
      idat.push(...data);
    }
    offset += 12 + length;
  }
  const raw = new Uint8Array(inflateSync(Buffer.from(idat)));
  const stride = 1 + width * 4;
  return {
    width,
    height,
    at: (x, y) => {
      expect(raw[y * stride]).toBe(0); // "None" filter
      const p = y * stride + 1 + x * 4;
      return [raw[p]!, raw[p + 1]!, raw[p + 2]!, raw[p + 3]!];
    },
  };
}

async function frameIds(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__obsipix?.document.timeline.frames.map((f) => f.id) ?? []);
}

test.describe('V1 workflow', () => {
  test('New → Draw → Edit → Animate → Save → Close → Open → Verify → Export', async ({ page }) => {
    // ---- New ---------------------------------------------------------------
    await open(page);
    await expect(page.getByTestId('status-dimensions')).toHaveText('32 × 32');
    await expect(page.getByTestId('status-dirty')).toHaveText('saved');

    // ---- Draw -------------------------------------------------------------
    await dragPixels(page, [4, 4], [12, 4]);
    expect((await pixelAt(page, 8, 4)).a).toBeGreaterThan(0);
    expect((await pixelAt(page, 8, 20)).a).toBe(0); // transparency preserved elsewhere

    // ---- Edit ------------------------------------------------------------
    // a second layer at reduced opacity
    await page.getByRole('button', { name: 'Add layer' }).click();
    await dragPixels(page, [20, 20], [26, 20]);
    const overlayId = await page.evaluate(() => window.__obsipix!.document.layers.activeLayerId);
    await page.evaluate((id) => {
      window.__obsipix!.setLayerOpacity(id, 0.5);
    }, overlayId);
    expect(
      await page.evaluate(
        () => window.__obsipix!.document.layers.layers.find((l) => l.opacity < 1)?.opacity,
      ),
    ).toBeCloseTo(0.5);

    // select + move a region as a float, then commit
    await page.getByRole('button', { name: 'Select', exact: true }).click();
    await dragPixels(page, [20, 18], [27, 23]);
    await page.getByRole('button', { name: 'Move', exact: true }).click();
    await dragPixels(page, [23, 20], [23, 26]);
    await page.keyboard.press('Enter'); // commit float
    expect((await pixelAt(page, 23, 26, { layerId: overlayId })).a).toBeGreaterThan(0);

    // undo/redo correctness: back to before the move, then forward again
    const afterMove = await pixelAt(page, 23, 26, { layerId: overlayId });
    await page.keyboard.press('Control+z');
    expect((await pixelAt(page, 23, 26, { layerId: overlayId })).a).toBe(0);
    await page.keyboard.press('Control+y');
    expect(await pixelAt(page, 23, 26, { layerId: overlayId })).toEqual(afterMove);

    // ---- Animate --------------------------------------------------------
    await page.keyboard.press('Control+Shift+A'); // clear the selection so drawing is unrestricted
    await page.getByRole('button', { name: 'Pencil' }).click();
    await page.getByRole('button', { name: 'Layer 1', exact: true }).click(); // back to the base layer
    await page.getByRole('button', { name: 'Add frame', exact: true }).click();
    await dragPixels(page, [4, 12], [12, 12]); // frame 2 content
    expect((await pixelAt(page, 8, 12)).a).toBeGreaterThan(0); // landed on the active cel
    await page.getByRole('button', { name: 'Add frame', exact: true }).click();
    await dragPixels(page, [4, 24], [12, 24]); // frame 3 content

    // per-frame duration on frame 3
    await page.getByRole('spinbutton', { name: /Frame 3 duration/ }).fill('250');
    // a tag spanning the animation
    await page.getByRole('button', { name: '+ Tag' }).click();
    await page.getByPlaceholder('Tag name').fill('loop');
    await page.getByPlaceholder('Tag name').press('Enter');
    // onion skin on
    await page.getByRole('button', { name: 'Onion' }).click();

    // link frame 3's cel to frame 1's cel on the active layer
    const ids = await frameIds(page);
    await page.evaluate(
      ([src, dst]) => {
        const s = window.__obsipix!;
        s.linkCel(src, dst, s.document.layers.activeLayerId);
      },
      [ids[0]!, ids[2]!] as const,
    );

    // play briefly then pause
    const timeline = page.getByRole('region', { name: 'Timeline' });
    await timeline.getByRole('button', { name: 'Play' }).click();
    await expect.poll(() => page.evaluate(() => window.__obsipix?.isPlaying)).toBe(true);
    await timeline.getByRole('button', { name: 'Pause' }).click();
    await expect.poll(() => page.evaluate(() => window.__obsipix?.isPlaying)).toBe(false);

    // ---- Save ----------------------------------------------------------
    await page.evaluate(() => window.__obsipix?.firstFrame());
    const download = page.waitForEvent('download');
    await menuAction(page, 'File', 'Save');
    const savedBytes = await readFile(await (await download).path());
    await expect(page.getByTestId('status-dirty')).toHaveText('saved');

    const savedShape = await page.evaluate(() => {
      const d = window.__obsipix!.document;
      return {
        layers: d.layers.count,
        frames: d.timeline.frameCount,
        durations: d.timeline.frames.map((f) => f.durationMs),
        tags: d.timeline.tags.map((t) => t.name),
      };
    });

    // ---- Close -------------------------------------------------------
    await menuAction(page, 'File', 'Close');
    await expect(page.getByTestId('status-dimensions')).toHaveText('32 × 32');
    expect((await pixelAt(page, 8, 4)).a).toBe(0); // blank again

    // ---- Open ------------------------------------------------------
    page.once('filechooser', (chooser) => {
      void chooser.setFiles({
        name: 'v1.obsipix',
        mimeType: 'application/x-obsipix',
        buffer: savedBytes,
      });
    });
    await menuAction(page, 'File', 'Open…');
    await page.waitForFunction(
      (want) => (window.__obsipix?.document.timeline.frameCount ?? 0) === want,
      savedShape.frames,
    );

    // ---- Verify ---------------------------------------------------
    const reloaded = await page.evaluate(() => {
      const d = window.__obsipix!.document;
      const ids2 = d.timeline.frames.map((f) => f.id);
      const layerA = d.layers.layers[0]!.id;
      const overlay = d.layers.layers[1]!.id;
      return {
        layers: d.layers.count,
        frames: d.timeline.frameCount,
        durations: d.timeline.frames.map((f) => f.durationMs),
        tags: d.timeline.tags.map((t) => t.name),
        overlayOpacity: d.layers.layers[1]!.opacity,
        // frame 1 drawing on layer A
        f1: d.resolveBuffer(layerA, ids2[0])!.getPixel(8, 4).a,
        // frame 2 drawing on layer A
        f2: d.resolveBuffer(layerA, ids2[1])!.getPixel(8, 12).a,
        // frame 3 cel is linked to frame 1
        f3Type: d.timeline.frames[2]!.getCel(layerA)?.type,
        // committed float landed on the overlay layer, frame 1
        overlayMoved: d.resolveBuffer(overlay, ids2[0])!.getPixel(23, 26).a,
      };
    });
    expect(reloaded.layers).toBe(savedShape.layers);
    expect(reloaded.frames).toBe(savedShape.frames);
    expect(reloaded.durations).toEqual(savedShape.durations);
    expect(reloaded.durations[2]).toBe(250);
    expect(reloaded.tags).toEqual(['loop']);
    expect(reloaded.overlayOpacity).toBeCloseTo(0.5);
    expect(reloaded.f1).toBeGreaterThan(0);
    expect(reloaded.f2).toBeGreaterThan(0);
    expect(reloaded.f3Type).toBe('linked');
    expect(reloaded.overlayMoved).toBeGreaterThan(0);
    await expect(page.getByTestId('status-dirty')).toHaveText('saved');
    expect(await page.evaluate(() => window.__obsipix?.canUndo)).toBe(false);

    // ---- Export -------------------------------------------------
    await page.evaluate(() => window.__obsipix?.firstFrame());
    const pngDownload = page.waitForEvent('download');
    await menuAction(page, 'File', 'Export PNG');
    const png = decodePng(await readFile(await (await pngDownload).path()));

    expect(png.width).toBe(32);
    expect(png.height).toBe(32);
    // the frame-1 stroke is in the exported image
    expect(png.at(8, 4)[3]).toBeGreaterThan(0);
    // no editor overlay baked in — an untouched pixel is fully transparent
    expect(png.at(0, 0)).toEqual([0, 0, 0, 0]);
    expect(png.at(31, 31)).toEqual([0, 0, 0, 0]);
  });
});
