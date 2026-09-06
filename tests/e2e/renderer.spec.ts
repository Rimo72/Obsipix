import { expect, test } from '@playwright/test';

interface Analysis {
  canvasWidth: number;
  canvasHeight: number;
  markers: Record<string, { count: number; cx: number; cy: number } | null>;
  redBlock: { width: number; height: number; uniform: boolean } | null;
  checkerboardPresent: boolean;
}

test.describe('renderer', () => {
  test('paints the document pixels crisply at the right screen positions', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto('/');

    const canvas = page.getByTestId('editor-canvas');
    await expect(canvas).toBeVisible();
    await page.waitForFunction(() => {
      const el = document.querySelector<HTMLCanvasElement>('[data-testid="editor-canvas"]');
      return !!el && el.width > 1;
    });

    const analysis = await canvas.evaluate((el): Analysis => {
      const c = el as HTMLCanvasElement;
      const ctx = c.getContext('2d');
      if (!ctx) {
        throw new Error('no context');
      }
      const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
      const near = (a: number, b: number) => Math.abs(a - b) <= 24;

      const targets: Record<string, [number, number, number]> = {
        red: [255, 0, 0],
        green: [0, 200, 0],
        blue: [0, 90, 255],
        yellow: [255, 210, 0],
        white: [255, 255, 255],
      };

      const markers: Analysis['markers'] = {};
      const redPixels: { x: number; y: number }[] = [];

      for (const [name, [tr, tg, tb]] of Object.entries(targets)) {
        let count = 0;
        let sx = 0;
        let sy = 0;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const i = (y * width + x) * 4;
            if (
              near(data[i] ?? -1, tr) &&
              near(data[i + 1] ?? -1, tg) &&
              near(data[i + 2] ?? -1, tb) &&
              (data[i + 3] ?? 0) > 200
            ) {
              count += 1;
              sx += x;
              sy += y;
              if (name === 'red') {
                redPixels.push({ x, y });
              }
            }
          }
        }
        markers[name] =
          count > 0 ? { count, cx: sx / count / width, cy: sy / count / height } : null;
      }

      let redBlock: Analysis['redBlock'] = null;
      if (redPixels.length > 0) {
        const xs = redPixels.map((p) => p.x);
        const ys = redPixels.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        let uniform = true;
        const first = (minY * width + minX) * 4;
        for (let y = minY; y <= maxY && uniform; y += 1) {
          for (let x = minX; x <= maxX; x += 1) {
            const i = (y * width + x) * 4;
            if (data[i] !== data[first] || data[i + 1] !== data[first + 1]) {
              uniform = false;
              break;
            }
          }
        }
        redBlock = { width: maxX - minX + 1, height: maxY - minY + 1, uniform };
      }

      // checkerboard: any mid-grey pixel anywhere on the canvas
      let checkerboardPresent = false;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        if (r > 180 && r < 220 && near(r, data[i + 1] ?? 0) && near(r, data[i + 2] ?? 0)) {
          checkerboardPresent = true;
          break;
        }
      }

      return {
        canvasWidth: c.width,
        canvasHeight: c.height,
        markers,
        redBlock,
        checkerboardPresent,
      };
    });

    // every marker colour was found
    for (const name of ['red', 'green', 'blue', 'yellow', 'white']) {
      expect(analysis.markers[name], `${name} marker`).not.toBeNull();
    }

    // corners map to the right quadrants → document coordinates map to screen correctly
    const { red, green, blue, yellow } = analysis.markers;
    expect(red && red.cx).toBeLessThan(0.5);
    expect(red && red.cy).toBeLessThan(0.5);
    expect(green && green.cx).toBeGreaterThan(0.5);
    expect(green && green.cy).toBeLessThan(0.5);
    expect(blue && blue.cx).toBeLessThan(0.5);
    expect(blue && blue.cy).toBeGreaterThan(0.5);
    expect(yellow && yellow.cx).toBeGreaterThan(0.5);
    expect(yellow && yellow.cy).toBeGreaterThan(0.5);

    // one document pixel renders as a solid, uniform block (nearest-neighbour, no AA)
    expect(analysis.redBlock?.uniform).toBe(true);
    expect(analysis.redBlock && analysis.redBlock.width).toBeGreaterThan(3);
    expect(
      Math.abs((analysis.redBlock?.width ?? 0) - (analysis.redBlock?.height ?? 0)),
    ).toBeLessThanOrEqual(1);

    expect(analysis.checkerboardPresent).toBe(true);
  });
});
