import { expect, test } from '@playwright/test';

import { dragPixels, menuAction, open } from './support';

test.describe('right sidebar panels', () => {
  test('collapse, close and reopen panels from the View menu without touching the document', async ({
    page,
  }) => {
    await open(page);
    await dragPixels(page, [4, 4], [10, 4]); // make an edit so we can watch dirty/history

    const before = await page.evaluate(() => ({
      dirty: window.__obsipix?.isDirty,
      depth: window.__obsipix?.history.depth,
    }));

    const layers = page.getByRole('region', { name: 'Layers' });
    await expect(layers).toBeVisible();
    await expect(layers.getByRole('button', { name: 'Add layer' })).toBeVisible();

    // Collapse — header stays, body goes.
    await layers.getByRole('button', { name: 'Layers', exact: true }).click();
    await expect(layers.getByRole('button', { name: 'Layers', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(layers.getByRole('button', { name: 'Add layer' })).toHaveCount(0);

    // Close — the whole panel disappears.
    await layers.getByRole('button', { name: 'Close Layers panel' }).click();
    await expect(page.getByRole('region', { name: 'Layers' })).toHaveCount(0);

    // Reopen from View ▸ Panel: Layers.
    await menuAction(page, 'View', 'Panel: Layers');
    await expect(page.getByRole('region', { name: 'Layers' })).toBeVisible();

    // The View item reflects visibility.
    await page.getByRole('menuitem', { name: 'View', exact: true }).click();
    await expect(page.getByRole('menuitemcheckbox', { name: 'Panel: Layers' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.keyboard.press('Escape');

    // None of that dirtied the document or added history.
    expect(
      await page.evaluate(() => ({
        dirty: window.__obsipix?.isDirty,
        depth: window.__obsipix?.history.depth,
      })),
    ).toEqual(before);
  });

  test('the sidebar width is keyboard-resizable and Reset Panel Layout restores it', async ({
    page,
  }) => {
    await open(page);

    const sidebar = page.locator('.right-sidebar');
    const startWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);

    const handle = page.getByRole('separator', { name: 'Resize sidebar' });
    await handle.focus();
    for (let i = 0; i < 5; i += 1) {
      await handle.press('ArrowLeft'); // drag the left edge left → wider
    }
    const widerWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
    expect(widerWidth).toBeGreaterThan(startWidth);

    await menuAction(page, 'View', 'Reset Panel Layout');
    const resetWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.round(resetWidth)).toBe(Math.round(startWidth));
  });

  test('a panel divider resizes the panel above it, cumulatively', async ({ page }) => {
    await open(page);
    const layersPanel = page.locator('[data-panel="layers"]');
    const before = await layersPanel.evaluate((el) => el.getBoundingClientRect().height);

    // the divider between Layers and Palettes
    const divider = page.getByRole('separator', { name: 'Resize Layers panel' });
    await divider.focus();
    for (let i = 0; i < 4; i += 1) {
      await divider.press('ArrowUp');
    }
    const after = await layersPanel.evaluate((el) => el.getBoundingClientRect().height);
    expect(after).toBeLessThan(before - 40); // 4 × 16px steps actually applied
  });

  test('the Animation (timeline) dock can be closed and reopened', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('region', { name: 'Animation', exact: true })).toBeVisible();

    await page
      .getByRole('region', { name: 'Animation', exact: true })
      .getByRole('button', { name: 'Close Animation panel' })
      .click();
    await expect(page.getByRole('region', { name: 'Animation', exact: true })).toHaveCount(0);
    await expect(page.getByTestId('timeline-frame')).toHaveCount(0);

    await menuAction(page, 'View', 'Panel: Animation');
    await expect(page.getByRole('region', { name: 'Animation', exact: true })).toBeVisible();
    await expect(page.getByTestId('timeline-frame')).toHaveCount(1);
  });
});
