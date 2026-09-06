import { expect, test } from '@playwright/test';

import { dragPixels, inspect, open, screenForPixel } from './support';

test.describe('vertical slice', () => {
  test('draw, erase, undo, redo end to end', async ({ page }) => {
    await open(page);

    // --- draw a horizontal line across row 5 ---
    await dragPixels(page, [5, 5], [20, 5]);

    let state = await inspect(page);
    expect(state.depth).toBe(1);
    expect(state.canUndo).toBe(true);
    expect(state.alpha[5]).toBeGreaterThan(0);
    expect(state.alpha[12]).toBeGreaterThan(0); // interpolated middle — no gap
    expect(state.alpha[20]).toBeGreaterThan(0);

    // the drawn pixel actually shows up on screen at the right place
    const mid = await screenForPixel(page, 12, 5);
    const rendered = await page.evaluate((point) => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="editor-canvas"]');
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        throw new Error('no context');
      }
      const rect = canvas.getBoundingClientRect();
      const data = ctx.getImageData(point.x - rect.left, point.y - rect.top, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    }, mid);
    expect(rendered.a).toBe(255);
    expect(rendered.r).toBeLessThan(40); // black foreground

    // --- undo ---
    await page.keyboard.press('Control+z');
    state = await inspect(page);
    expect(state.depth).toBe(0);
    expect(state.canUndo).toBe(false);
    expect(state.alpha[12]).toBe(0);

    // --- redo ---
    await page.keyboard.press('Control+Shift+z');
    state = await inspect(page);
    expect(state.depth).toBe(1);
    expect(state.alpha[12]).toBeGreaterThan(0);

    // --- erase part of the line ---
    await page.getByRole('button', { name: 'Eraser' }).click();
    await dragPixels(page, [10, 5], [15, 5]);

    state = await inspect(page);
    expect(state.depth).toBe(2);
    expect(state.alpha[5]).toBeGreaterThan(0); // untouched
    expect(state.alpha[12]).toBe(0); // erased
    expect(state.alpha[20]).toBeGreaterThan(0); // untouched
  });
});
