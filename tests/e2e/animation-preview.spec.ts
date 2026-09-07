import { expect, test } from '@playwright/test';

import { dragPixels, open } from './support';

test.describe('timeline thumbnails and animation preview', () => {
  test('every timeline frame shows a thumbnail and the preview tracks the frame', async ({
    page,
  }) => {
    await open(page);

    await dragPixels(page, [4, 4], [18, 4]); // frame 1 artwork
    await page.getByRole('button', { name: 'Add frame' }).click();
    await dragPixels(page, [4, 20], [18, 20]); // frame 2 artwork

    const frames = page.getByTestId('timeline-frame');
    await expect(frames).toHaveCount(2);
    expect(await frames.nth(0).locator('canvas.frame-thumb').count()).toBe(1);
    expect(await frames.nth(1).locator('canvas.frame-thumb').count()).toBe(1);

    const preview = page.getByRole('region', { name: 'Animation preview' });
    await expect(preview).toBeVisible();
    await expect(preview.locator('canvas.animation-preview__canvas')).toBeVisible();

    await page.evaluate(() => window.__obsipix?.firstFrame());
    await expect(page.getByTestId('animation-preview-frame')).toHaveText('1 / 2');
    await preview.getByRole('button', { name: 'Next frame' }).click();
    await expect(page.getByTestId('animation-preview-frame')).toHaveText('2 / 2');
  });

  test('scale + background controls work and playback never mutates the document', async ({
    page,
  }) => {
    await open(page);
    await dragPixels(page, [4, 4], [10, 4]);
    await page.getByRole('button', { name: 'Add frame' }).click();
    await dragPixels(page, [4, 10], [10, 10]);

    const preview = page.getByRole('region', { name: 'Animation preview' });
    await preview.getByRole('button', { name: '4×' }).click();
    await expect(preview.getByRole('button', { name: '4×' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await preview.getByRole('button', { name: 'Black background' }).click();
    await expect(preview.getByRole('button', { name: 'Black background' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const before = await page.evaluate(() => ({
      depth: window.__obsipix?.history.depth,
      frames: window.__obsipix?.document.timeline.frameCount,
      durations: window.__obsipix?.document.timeline.frames.map((f) => f.durationMs),
    }));

    await page.evaluate(() => window.__obsipix?.firstFrame());
    await preview.getByRole('button', { name: 'Play' }).click();
    await expect.poll(() => page.evaluate(() => window.__obsipix?.isPlaying)).toBe(true);
    await expect
      .poll(() => page.getByTestId('animation-preview-frame').textContent())
      .not.toBe('1 / 2');
    await preview.getByRole('button', { name: 'Pause' }).click();

    const after = await page.evaluate(() => ({
      depth: window.__obsipix?.history.depth,
      frames: window.__obsipix?.document.timeline.frameCount,
      durations: window.__obsipix?.document.timeline.frames.map((f) => f.durationMs),
    }));
    expect(after).toEqual(before);
  });
});
