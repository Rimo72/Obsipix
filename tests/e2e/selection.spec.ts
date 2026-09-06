import { expect, test, type Page } from '@playwright/test';

import { dragPixels, menuAction, open, screenForPixel } from './support';

function alphaAt(page: Page, x: number, y: number): Promise<number> {
  return page.evaluate(
    ({ px, py }) => {
      const session = window.__obsipix;
      const buffer = session?.document.resolveBuffer(session.document.layers.activeLayerId);
      return buffer ? buffer.getPixel(px, py).a : -1;
    },
    { px: x, py: y },
  );
}

async function dragScreen(page: Page, from: [number, number], to: [number, number]): Promise<void> {
  const a = await screenForPixel(page, from[0], from[1]);
  const b = await screenForPixel(page, to[0], to[1]);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

test.describe('selection and transform', () => {
  test('select a region, move it as a float, then commit', async ({ page }) => {
    await open(page);

    // draw a 3x3 block around (6,6)
    await page.getByRole('button', { name: 'Pencil' }).click();
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        await dragPixels(page, [6 + dx, 6 + dy], [6 + dx, 6 + dy]);
      }
    }
    expect(await alphaAt(page, 6, 6)).toBeGreaterThan(0);

    // marquee-select a box around it
    await page.getByRole('button', { name: 'Select', exact: true }).click();
    await dragScreen(page, [4, 4], [8, 8]);
    expect(await page.evaluate(() => window.__obsipix?.document.selection.active)).toBe(true);

    // move it with the Move tool
    await page.getByRole('button', { name: 'Move' }).click();
    await dragScreen(page, [6, 6], [20, 6]);
    // while floating, the source has a hole
    expect(await alphaAt(page, 6, 6)).toBe(0);

    // commit with Enter
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => window.__obsipix?.hasFloat)).toBe(false);
    expect(await alphaAt(page, 20, 6)).toBeGreaterThan(0);
    expect(await alphaAt(page, 6, 6)).toBe(0);

    // undo brings it home in one step
    await page.keyboard.press('Control+z');
    expect(await alphaAt(page, 6, 6)).toBeGreaterThan(0);
    expect(await alphaAt(page, 20, 6)).toBe(0);
  });

  test('flip horizontal mirrors the layer and undoes', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Pencil' }).click();
    await dragPixels(page, [1, 1], [1, 1]);
    expect(await alphaAt(page, 1, 1)).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Flip H' }).click();
    expect(await alphaAt(page, 30, 1)).toBeGreaterThan(0);
    expect(await alphaAt(page, 1, 1)).toBe(0);

    await page.keyboard.press('Control+z');
    expect(await alphaAt(page, 1, 1)).toBeGreaterThan(0);
  });

  test('canvas resize changes the reported dimensions', async ({ page }) => {
    await open(page);
    await menuAction(page, 'Image', 'Resize…');
    await page.getByRole('dialog').getByRole('tab', { name: 'Canvas size' }).click();

    const widthField = page.getByRole('dialog').getByLabel('Width');
    await widthField.fill('48');
    await page.getByRole('dialog').getByRole('button', { name: 'Apply' }).click();

    await expect(page.getByTestId('status-dimensions')).toHaveText('48 × 32');
    await page.keyboard.press('Control+z');
    await expect(page.getByTestId('status-dimensions')).toHaveText('32 × 32');
  });
});
