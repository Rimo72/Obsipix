import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { dragPixels, open } from './support';

function frameAlpha(
  page: import('@playwright/test').Page,
  frameIndex: number,
  x: number,
  y: number,
): Promise<number> {
  return page.evaluate(
    ({ frameIndex: fi, x: px, y: py }) => {
      const session = window.__obsipix;
      if (!session) {
        throw new Error('session missing');
      }
      const { timeline, layers } = session.document;
      const frame = timeline.frames[fi];
      if (!frame) {
        return -1;
      }
      const buffer = session.document.resolveBuffer(layers.activeLayerId, frame.id);
      return buffer ? buffer.getPixel(px, py).a : 0;
    },
    { frameIndex, x, y },
  );
}

test.describe('animation', () => {
  test('create, edit, save, reopen and play a two-frame animation', async ({ page }) => {
    await open(page);

    // frame 1: a stroke near the top
    await dragPixels(page, [4, 4], [18, 4]);
    expect(await frameAlpha(page, 0, 10, 4)).toBeGreaterThan(0);

    // add a frame from the timeline and draw something different on it
    await page.getByRole('button', { name: 'Add frame' }).click();
    await expect(page.getByTestId('timeline-frame')).toHaveCount(2);
    await dragPixels(page, [4, 20], [18, 20]);

    expect(await frameAlpha(page, 1, 10, 20)).toBeGreaterThan(0);
    // frame 1 is untouched by the frame-2 stroke
    expect(await frameAlpha(page, 0, 10, 20)).toBe(0);

    // --- save ---
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save' }).click();
    const download = await downloadPromise;
    const bytes = await readFile(await download.path());

    // --- reopen in a fresh session ---
    await page.reload();
    await open(page);
    page.once('filechooser', (chooser) => {
      void chooser.setFiles({
        name: 'anim.obsipix',
        mimeType: 'application/x-obsipix',
        buffer: bytes,
      });
    });
    await page.getByRole('button', { name: 'Open' }).click();

    await page.waitForFunction(() => (window.__obsipix?.document.timeline.frameCount ?? 0) === 2);
    expect(await frameAlpha(page, 0, 10, 4)).toBeGreaterThan(0);
    expect(await frameAlpha(page, 1, 10, 20)).toBeGreaterThan(0);

    // --- play ---
    await page.evaluate(() => window.__obsipix?.firstFrame());
    const startId = await page.evaluate(() => window.__obsipix?.document.timeline.activeFrameId);
    await page.getByRole('button', { name: 'Play' }).click();
    await expect
      .poll(() => page.evaluate(() => window.__obsipix?.document.timeline.activeFrameId))
      .not.toBe(startId);
    expect(await page.evaluate(() => window.__obsipix?.isPlaying)).toBe(true);

    await page.getByRole('button', { name: 'Pause' }).click();
    expect(await page.evaluate(() => window.__obsipix?.isPlaying)).toBe(false);
  });
});
