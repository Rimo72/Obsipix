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

/** Set the foreground colour to an exact 8-digit hex via the colour popover. */
async function setForegroundHex(page: Page, hex: string): Promise<void> {
  const trigger = page.getByRole('button', { name: /Foreground colour/ });
  await trigger.click();
  const picker = page
    .getByTestId('color-popover')
    .getByRole('group', { name: 'Foreground colour' });
  const field = picker.getByLabel(/hex value/);
  await field.fill(hex);
  await field.blur();
  await page.keyboard.press('Escape'); // close the popover so it doesn't cover the canvas
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
    await page.getByRole('button', { name: 'Move', exact: true }).click();
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

  test('magic wand selects a contiguous colour region and Shift adds to it', async ({ page }) => {
    await open(page);

    // paint a wall splitting the 32x32 canvas into a left and right half
    await page.getByRole('button', { name: 'Pencil' }).click();
    await dragPixels(page, [16, 0], [16, 31]);

    await page.getByRole('button', { name: 'Wand' }).click();
    const leftScreen = await screenForPixel(page, 5, 5);
    await page.mouse.click(leftScreen.x, leftScreen.y);

    expect(await page.evaluate(() => window.__obsipix?.document.selection.bounds())).toEqual({
      x: 0,
      y: 0,
      width: 16,
      height: 32,
    });
    // the wall itself was never selected
    expect(await page.evaluate(() => window.__obsipix?.document.selection.isSelected(16, 5))).toBe(
      false,
    );

    // Shift-click the other side adds to the selection
    const rightScreen = await screenForPixel(page, 25, 5);
    await page.keyboard.down('Shift');
    await page.mouse.click(rightScreen.x, rightScreen.y);
    await page.keyboard.up('Shift');

    expect(await page.evaluate(() => window.__obsipix?.document.selection.bounds())).toEqual({
      x: 0,
      y: 0,
      width: 32,
      height: 32,
    });
    expect(await page.evaluate(() => window.__obsipix?.document.selection.isSelected(5, 5))).toBe(
      true,
    );
    expect(await page.evaluate(() => window.__obsipix?.document.selection.isSelected(25, 5))).toBe(
      true,
    );
    expect(await page.evaluate(() => window.__obsipix?.document.selection.isSelected(16, 5))).toBe(
      false,
    );

    // a plain click elsewhere replaces the selection rather than adding to it
    await page.mouse.click(rightScreen.x, rightScreen.y);
    expect(await page.evaluate(() => window.__obsipix?.document.selection.isSelected(5, 5))).toBe(
      false,
    );
    expect(await page.evaluate(() => window.__obsipix?.document.selection.isSelected(25, 5))).toBe(
      true,
    );

    // deleting the selection clears the right half but leaves the wall alone
    await page.keyboard.press('Delete');
    expect(await alphaAt(page, 25, 5)).toBe(0);
    expect(await alphaAt(page, 16, 5)).toBeGreaterThan(0);
  });

  test('magic wand tolerance picks up near-matching colours', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Pencil' }).click();

    await setForegroundHex(page, '#000000ff');
    await dragPixels(page, [10, 10], [10, 10]);
    await setForegroundHex(page, '#060000ff'); // a faint, near-black shade
    await dragPixels(page, [11, 10], [11, 10]);
    await setForegroundHex(page, '#280000ff'); // clearly a different colour
    await dragPixels(page, [12, 10], [12, 10]);

    await page.getByRole('button', { name: 'Wand' }).click();
    const tolerance = page.getByRole('spinbutton', { name: 'Tolerance', exact: true });
    await expect(tolerance).toHaveValue('0');

    const seed = await screenForPixel(page, 10, 10);
    await page.mouse.click(seed.x, seed.y);
    expect(await page.evaluate(() => window.__obsipix?.document.selection.isSelected(10, 10))).toBe(
      true,
    );
    expect(await page.evaluate(() => window.__obsipix?.document.selection.isSelected(11, 10))).toBe(
      false,
    );

    await tolerance.fill('10');
    await page.mouse.click(seed.x, seed.y);
    expect(await page.evaluate(() => window.__obsipix?.document.selection.isSelected(10, 10))).toBe(
      true,
    );
    expect(await page.evaluate(() => window.__obsipix?.document.selection.isSelected(11, 10))).toBe(
      true,
    );
    // still excluded — its difference (0x28 = 40) is well past a tolerance of 10
    expect(await page.evaluate(() => window.__obsipix?.document.selection.isSelected(12, 10))).toBe(
      false,
    );
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
