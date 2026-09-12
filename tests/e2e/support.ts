import { expect, type Page } from '@playwright/test';

interface Cel {
  readonly type: 'normal' | 'linked' | 'empty' | 'hold';
}

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface PaletteColor {
  id: string;
  name?: string;
  rgba: Rgba;
}

interface ObsipixSession {
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
    documentToCanvas(p: { x: number; y: number }): { x: number; y: number };
  };
  activeToolId: string;
  eyedropperMerged: boolean;
  document: {
    metadata: { name: string };
    layers: {
      activeLayerId: string;
      count: number;
      layers: readonly { id: string; name: string; opacity: number; visible: boolean }[];
    };
    dimensions: { width: number; height: number };
    selection: {
      active: boolean;
      bounds(): { x: number; y: number; width: number; height: number } | null;
      isSelected(x: number, y: number): boolean;
    };
    palettes: { id: string; name: string; colors: PaletteColor[] }[];
    activePaletteId: string | null;
    activePalette: { id: string; name: string; colors: PaletteColor[] } | null;
    resolveBuffer(
      id: string,
      frameId?: string,
    ): { getPixel(x: number, y: number): { r: number; g: number; b: number; a: number } } | null;
    timeline: {
      frameCount: number;
      activeFrameId: string;
      playbackFps: number;
      frames: readonly {
        id: string;
        durationMs: number;
        getCel(layerId: string): Cel | undefined;
      }[];
      tags: readonly { name: string; startFrame: number; endFrame: number }[];
      indexOf(id: string): number;
    };
  };
  history: { depth: number };
  isPlaying: boolean;
  firstFrame(): void;
  nextFrame(): void;
  setActiveFrame(id: string): void;
  setLayerOpacity(layerId: string, opacity: number): void;
  linkCel(sourceFrameId: string, targetFrameId: string, layerId: string): void;
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

/** Open a top-level menu and click one of its items (both names matched exactly). */
export async function menuAction(page: Page, menu: string, item: string): Promise<void> {
  await page.getByRole('menuitem', { name: menu, exact: true }).click();
  const dropdown = page.getByRole('menu', { name: menu });
  await dropdown
    .getByRole('menuitem', { name: item, exact: true })
    .or(dropdown.getByRole('menuitemcheckbox', { name: item, exact: true }))
    .click();
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

/** One pixel of a layer at a frame (defaults: active layer, active frame). */
export function pixelAt(
  page: Page,
  x: number,
  y: number,
  opts: { layerId?: string; frameId?: string } = {},
): Promise<{ r: number; g: number; b: number; a: number }> {
  return page.evaluate(
    ({ x: px, y: py, layerId, frameId }) => {
      const session = window.__obsipix;
      if (!session) {
        throw new Error('session missing');
      }
      const layer = layerId ?? session.document.layers.activeLayerId;
      const buffer = session.document.resolveBuffer(layer, frameId);
      return buffer ? buffer.getPixel(px, py) : { r: 0, g: 0, b: 0, a: 0 };
    },
    { x, y, layerId: opts.layerId, frameId: opts.frameId },
  );
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
