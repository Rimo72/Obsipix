import { expect, test } from '@playwright/test';

import { dragPixels, menuAction, open, pixelAt, screenForPixel } from './support';

test.describe('v2 editor additions', () => {
  test('New Document dialog: preset size + solid background', async ({ page }) => {
    await open(page);

    await menuAction(page, 'File', 'New');
    const dialog = page.getByRole('dialog', { name: 'New document' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: '64×64' }).click();
    await dialog.getByRole('radio', { name: 'White' }).click();
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByTestId('status-dimensions')).toHaveText('64 × 64');
    expect(await pixelAt(page, 0, 0)).toMatchObject({ r: 255, g: 255, b: 255, a: 255 });
    expect(await pixelAt(page, 63, 63)).toMatchObject({ r: 255, g: 255, b: 255, a: 255 });
  });

  test('v2 tool shortcuts (R = Rectangle, M = Move)', async ({ page }) => {
    await open(page);
    await page.getByTestId('editor-canvas').click({ position: { x: 5, y: 5 } });

    await page.keyboard.press('r');
    expect(await page.evaluate(() => window.__obsipix?.activeToolId)).toContain('rect');

    await page.keyboard.press('m');
    expect(await page.evaluate(() => window.__obsipix?.activeToolId)).toContain('move');

    await page.keyboard.press('b');
    expect(await page.evaluate(() => window.__obsipix?.activeToolId)).toContain('pencil');
  });

  test('invert selection and Ctrl+Shift+A deselect', async ({ page }) => {
    await open(page);
    await dragPixels(page, [2, 2], [8, 8]); // some artwork
    await page.getByRole('button', { name: 'Select', exact: true }).click();
    await dragPixels(page, [0, 0], [4, 4]);
    expect(await page.evaluate(() => window.__obsipix?.document.selection.active)).toBe(true);

    await page.keyboard.press('Control+Shift+I');
    const inverted = await page.evaluate(() => {
      const sel = window.__obsipix!.document.selection as unknown as {
        active: boolean;
        isSelected(x: number, y: number): boolean;
      };
      return { active: sel.active, corner: sel.isSelected(0, 0), far: sel.isSelected(20, 20) };
    });
    expect(inverted).toEqual({ active: true, corner: false, far: true });

    await page.keyboard.press('Control+Shift+A');
    expect(await page.evaluate(() => window.__obsipix?.document.selection.active)).toBe(false);
  });

  test('zoom presets 1 / 2 and Space-drag panning', async ({ page }) => {
    await open(page);
    await page.getByTestId('editor-canvas').click({ position: { x: 10, y: 10 } });

    await page.keyboard.press('1');
    expect(await page.evaluate(() => window.__obsipix?.viewport.zoom)).toBeCloseTo(1);
    await page.keyboard.press('2');
    expect(await page.evaluate(() => window.__obsipix?.viewport.zoom)).toBeCloseTo(2);

    const panBefore = await page.evaluate(() => window.__obsipix?.viewport.panX ?? 0);
    const start = await screenForPixel(page, 16, 16);
    await page.keyboard.down('Space');
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 40, start.y + 20, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up('Space');

    expect(await page.evaluate(() => window.__obsipix?.viewport.panX ?? 0)).not.toBe(panBefore);
  });

  test('eyedropper Merged / Layer sampling modes', async ({ page }) => {
    await open(page);
    // black on the base layer, then an empty layer on top
    await dragPixels(page, [6, 6], [6, 6]);
    await page.getByRole('button', { name: 'Add layer' }).click();

    await page.getByRole('button', { name: 'Pick', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Eyedropper mode' })).toBeVisible();

    const sampleAt6 = async (): Promise<{ r: number; g: number; b: number; a: number }> => {
      const p = await screenForPixel(page, 6, 6);
      await page.mouse.click(p.x, p.y);
      return page.evaluate(() => window.__obsipix!.foreground);
    };

    await page.getByRole('button', { name: 'Merged' }).click();
    expect((await sampleAt6()).a).toBeGreaterThan(0); // sees the base layer through the empty one

    await page.getByRole('button', { name: 'Layer', exact: true }).click();
    expect((await sampleAt6()).a).toBe(0); // top layer is empty here
  });
});
