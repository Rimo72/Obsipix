import { expect, type Page } from '@playwright/test';

interface ObsipixSession {
  viewport: { documentToCanvas(p: { x: number; y: number }): { x: number; y: number } };
  document: {
    layers: { activeLayerId: string };
    dimensions: { width: number; height: number };
    selection: { active: boolean };
    palettes: { id: string; name: string; colors: unknown[] }[];
    activePaletteId: string | null;
    resolveBuffer(
      id: string,
    ): { getPixel(x: number, y: number): { r: number; g: number; b: number; a: number } } | null;
  };
  history: { depth: number };
  foreground: { r: number; g: number; b: number; a: number };
  background: { r: number; g: number; b: number; a: number };
  recentColors: readonly { r: number; g: number; b: number; a: number }[];
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  hasFloat: boolean;
}

declare global {
  interface Window {
    __obsipix?: ObsipixSession;
  }
}

const CANVAS = '[data-testid="editor-canvas"]';

export async function ready(page: Page): Promise<void> {
  await expect(page.getByTestId('editor-canvas')).toBeVisible();
  await page.waitForFunction((selector) => {
    const canvas = document.querySelector<HTMLCanvasElement>(selector);
    return !!window.__obsipix && !!canvas && canvas.width > 1;
  }, CANVAS);
}

export async function open(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto('/');
  await ready(page);
}

export function screenForPixel(
  page: Page,
  px: number,
  py: number,
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ px: x, py: y, selector }) => {
      const session = window.__obsipix;
      const canvas = document.querySelector<HTMLCanvasElement>(selector);
      if (!session || !canvas) {
        throw new Error('session/canvas missing');
      }
      const rect = canvas.getBoundingClientRect();
      const point = session.viewport.documentToCanvas({ x: x + 0.5, y: y + 0.5 });
      return { x: rect.left + point.x, y: rect.top + point.y };
    },
    { px, py, selector: CANVAS },
  );
}

export async function dragPixels(
  page: Page,
  from: [number, number],
  to: [number, number],
): Promise<void> {
  const start = await screenForPixel(page, from[0], from[1]);
  const end = await screenForPixel(page, to[0], to[1]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}

export interface SliceState {
  depth: number;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  alpha: Record<number, number>;
}

export function inspect(page: Page, columns: readonly number[] = [5, 12, 20]): Promise<SliceState> {
  return page.evaluate((cols) => {
    const session = window.__obsipix;
    if (!session) {
      throw new Error('session missing');
    }
    const buffer = session.document.resolveBuffer(session.document.layers.activeLayerId);
    const alpha: Record<number, number> = {};
    for (const x of cols) {
      alpha[x] = buffer ? buffer.getPixel(x, 5).a : 0;
    }
    return {
      depth: session.history.depth,
      canUndo: session.canUndo,
      canRedo: session.canRedo,
      isDirty: session.isDirty,
      alpha,
    };
  }, columns);
}
