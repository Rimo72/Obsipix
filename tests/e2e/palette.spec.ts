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

    await page.getByRole('button', { name: 'Add a colour to the palette' }).click();
    const dialog = page.getByRole('dialog', { name: 'Color Management' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Add Color' }).click();
    await expect(page.getByTestId('palette-grid').getByRole('button')).toHaveCount(17);

    await page.keyboard.press('Control+z');
    await expect(page.getByTestId('palette-grid').getByRole('button')).toHaveCount(16);

    await page.getByRole('button', { name: 'New palette', exact: true }).click();
    const count = await page.evaluate(() => window.__obsipix?.document.palettes.length);
    expect(count).toBe(2);
  });

  test('the Color Management window adds an exact colour and edits one in place', async ({
    page,
  }) => {
    await open(page);

    // Add: type an exact hex, confirm
    await page.getByRole('button', { name: 'Add a colour to the palette' }).click();
    const add = page.getByRole('dialog', { name: 'Color Management' });
    const hex = add.getByLabel('HEX');
    await hex.fill('#123456ff');
    await hex.blur();
    await add.getByRole('button', { name: 'Add Color' }).click();

    const swatches = page.getByTestId('palette-grid').getByRole('button');
    await expect(swatches).toHaveCount(17);
    const added = await page.evaluate(
      () => window.__obsipix?.document.activePalette?.colors.at(-1)?.rgba,
    );
    expect(added).toMatchObject({ r: 0x12, g: 0x34, b: 0x56, a: 255 });

    // Edit: double-click the new swatch, change a channel, save
    await swatches.nth(16).dblclick();
    const edit = page.getByRole('dialog', { name: 'Color Management' });
    await edit.getByLabel('Red').fill('200');
    await edit.getByLabel('Red').blur();
    await edit.getByRole('button', { name: 'Save Color' }).click();

    const edited = await page.evaluate(
      () => window.__obsipix?.document.activePalette?.colors.at(-1)?.rgba,
    );
    expect(edited).toMatchObject({ r: 200, g: 0x34, b: 0x56 });
  });

  test('"Pick from Canvas" samples a pixel into the colour dialog', async ({ page }) => {
    await open(page);

    // paint a known pixel with palette red (#ff004d) at (10, 10)
    const swatches = page.getByTestId('palette-grid').getByRole('button');
    await swatches.nth(8).click();
    await page.getByRole('button', { name: 'Pencil' }).click();
    await dragPixels(page, [10, 10], [10, 10]);

    await page.getByRole('button', { name: 'Add a colour to the palette' }).click();
    await page.getByRole('button', { name: 'Pick from Canvas' }).click();
    await expect(page.getByRole('dialog', { name: 'Color Management' })).toBeHidden();

    const target = await screenForPixel(page, 10, 10);
    await page.mouse.click(target.x, target.y);

    const dialog = page.getByRole('dialog', { name: 'Color Management' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Red')).toHaveValue('255');
    await dialog.getByRole('button', { name: 'Add Color' }).click();

    const added = await page.evaluate(
      () => window.__obsipix?.document.activePalette?.colors.at(-1)?.rgba,
    );
    expect(added).toMatchObject({ r: 255, g: 0, b: 0x4d });
  });
});
