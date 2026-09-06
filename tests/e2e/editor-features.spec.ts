import { expect, test, type Page } from '@playwright/test';

import { open, screenForPixel } from './support';

function readPixel(
  page: Page,
  x: number,
  y: number,
): Promise<{ r: number; g: number; b: number; a: number }> {
  return page.evaluate(
    ({ px, py }) => {
      const session = window.__obsipix;
      const buffer = session?.document.resolveBuffer(session.document.layers.activeLayerId);
      if (!buffer) {
        throw new Error('no buffer');
      }
      return buffer.getPixel(px, py);
    },
    { px: x, py: y },
  );
}

test.describe('editor features', () => {
  test('fill tool floods the layer and is one undo step', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Fill' }).click();

    const centre = await screenForPixel(page, 16, 16);
    await page.mouse.click(centre.x, centre.y);

    await expect.poll(async () => (await readPixel(page, 0, 0)).a).toBeGreaterThan(0);
    expect((await readPixel(page, 31, 31)).a).toBeGreaterThan(0);

    await page.keyboard.press('Control+z');
    expect((await readPixel(page, 16, 16)).a).toBe(0);
  });

  test('rectangle tool previews during the drag and commits on release', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Rect' }).click();

    const a = await screenForPixel(page, 6, 6);
    const b = await screenForPixel(page, 20, 16);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 8 });

    // mid-drag the artwork buffer is still clean (preview is an overlay)
    expect((await readPixel(page, 6, 6)).a).toBe(0);
    await page.mouse.up();

    // corners are now drawn, interior is not
    expect((await readPixel(page, 6, 6)).a).toBeGreaterThan(0);
    expect((await readPixel(page, 20, 16)).a).toBeGreaterThan(0);
    expect((await readPixel(page, 13, 11)).a).toBe(0);
  });

  test('adding a layer, filling it and hiding it changes what renders', async ({ page }) => {
    await open(page);

    await page.locator('.layer-panel__toolbar button[title="Add layer"]').click();
    await expect(page.getByTestId('layer-row')).toHaveCount(2);

    await page.getByRole('button', { name: 'Fill' }).click();
    const centre = await screenForPixel(page, 16, 16);
    await page.mouse.click(centre.x, centre.y);

    const sampleRed = (): Promise<number> =>
      page.evaluate(() => {
        const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="editor-canvas"]');
        const ctx = canvas?.getContext('2d');
        const session = window.__obsipix;
        if (!canvas || !ctx || !session) {
          throw new Error('no ctx');
        }
        const point = session.viewport.documentToCanvas({ x: 16.5, y: 16.5 });
        return ctx.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data[0] ?? 0;
      });

    // black fill shows through at (16,16)
    expect(await sampleRed()).toBeLessThan(40);

    // hide the top layer (first row) — that spot now shows the light checkerboard
    await page.getByTestId('layer-row').first().getByRole('button', { name: 'Hide layer' }).click();

    await expect.poll(sampleRed).toBeGreaterThan(150);
  });
});
