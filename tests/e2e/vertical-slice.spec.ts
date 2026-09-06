import { expect, test, type Page } from '@playwright/test';

interface ObsipixSession {
  viewport: { documentToCanvas(p: { x: number; y: number }): { x: number; y: number } };
  document: {
    layers: { activeLayerId: string };
    resolveBuffer(
      id: string,
    ): { getPixel(x: number, y: number): { r: number; g: number; b: number; a: number } } | null;
  };
  history: { depth: number };
  canUndo: boolean;
  canRedo: boolean;
}

declare global {
  interface Window {
    __obsipix?: ObsipixSession;
  }
}

async function ready(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('editor-canvas')).toBeVisible();
  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="editor-canvas"]');
    return !!window.__obsipix && !!canvas && canvas.width > 1;
  });
}

function screenForPixel(page: Page, px: number, py: number): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ px: x, py: y }) => {
      const session = window.__obsipix;
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="editor-canvas"]');
      if (!session || !canvas) {
        throw new Error('session/canvas missing');
      }
      const rect = canvas.getBoundingClientRect();
      const point = session.viewport.documentToCanvas({ x: x + 0.5, y: y + 0.5 });
      return { x: rect.left + point.x, y: rect.top + point.y };
    },
    { px, py },
  );
}

function inspect(page: Page): Promise<{
  depth: number;
  canUndo: boolean;
  canRedo: boolean;
  alpha: Record<number, number>;
}> {
  return page.evaluate(() => {
    const session = window.__obsipix;
    if (!session) {
      throw new Error('session missing');
    }
    const buffer = session.document.resolveBuffer(session.document.layers.activeLayerId);
    const alpha: Record<number, number> = {};
    for (const x of [5, 12, 20]) {
      alpha[x] = buffer ? buffer.getPixel(x, 5).a : 0;
    }
    return {
      depth: session.history.depth,
      canUndo: session.canUndo,
      canRedo: session.canRedo,
      alpha,
    };
  });
}

async function dragPixels(page: Page, from: [number, number], to: [number, number]): Promise<void> {
  const start = await screenForPixel(page, from[0], from[1]);
  const end = await screenForPixel(page, to[0], to[1]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}

test.describe('vertical slice', () => {
  test('draw, erase, undo, redo end to end', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await ready(page);

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
