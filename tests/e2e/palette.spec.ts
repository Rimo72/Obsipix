import { expect, test } from '@playwright/test';

import { dragPixels, open, screenForPixel } from './support';

test.describe('palette', () => {
  test('picking a swatch sets the drawing colour', async ({ page }) => {
    await open(page);

    const swatches = page.getByTestId('palette-grid').getByRole('button');
    await expect(swatches).toHaveCount(16);

    // PICO-8 swatch index 8 is red (#ff004d)
    await swatches.nth(8).click();
    const fg = await page.evaluate(() => window.__obsipix?.foreground);
    expect(fg?.r).toBeGreaterThan(200);
    expect(fg?.g).toBeLessThan(40);

    await page.getByRole('button', { name: 'Pencil' }).click();
    await dragPixels(page, [10, 10], [10, 10]);

    const mid = await screenForPixel(page, 10, 10);
    const rendered = await page.evaluate((point) => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="editor-canvas"]');
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        throw new Error('no ctx');
      }
      const rect = canvas.getBoundingClientRect();
      const d = ctx.getImageData(point.x - rect.left, point.y - rect.top, 1, 1).data;
      return { r: d[0] ?? 0, g: d[1] ?? 0 };
    }, mid);
    expect(rendered.r).toBeGreaterThan(200);
    expect(rendered.g).toBeLessThan(40);
  });

  test('adding a colour and creating a palette are undoable', async ({ page }) => {
    await open(page);

    await page.getByRole('button', { name: 'Add the foreground colour to the palette' }).click();
    await expect(page.getByTestId('palette-grid').getByRole('button')).toHaveCount(17);

    await page.keyboard.press('Control+z');
    await expect(page.getByTestId('palette-grid').getByRole('button')).toHaveCount(16);

    await page.getByRole('button', { name: 'New palette', exact: true }).click();
    const count = await page.evaluate(() => window.__obsipix?.document.palettes.length);
    expect(count).toBe(2);
  });
});
