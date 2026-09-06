import { expect, test } from '@playwright/test';

import { dragPixels, inspect, open } from './support';

declare global {
  interface Window {
    __obsipixAutosave?: { tick: () => Promise<void> };
  }
}

/** Force an autosave write (dev-only seam) so the test does not race the interval. */
async function autosave(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__obsipixAutosave));
  await page.evaluate(() => window.__obsipixAutosave?.tick());
}

test.describe('crash recovery', () => {
  test('unsaved work survives a browser reload', async ({ page }) => {
    await open(page);

    await dragPixels(page, [5, 5], [24, 5]);
    expect((await inspect(page)).isDirty).toBe(true);
    await autosave(page);

    // simulate a lost tab
    await page.reload();
    await open(page);

    const dialog = page.getByRole('dialog', { name: 'Recover unsaved work' });
    await expect(dialog).toBeVisible();

    // the fresh document is blank until we recover
    expect((await inspect(page)).alpha[12]).toBe(0);

    await dialog.getByRole('button', { name: 'Recover' }).click();
    await expect(dialog).toBeHidden();

    const state = await inspect(page);
    expect(state.alpha[5]).toBeGreaterThan(0);
    expect(state.alpha[12]).toBeGreaterThan(0);
    expect(state.alpha[20]).toBeGreaterThan(0);
    expect(state.isDirty).toBe(true); // recovered work still needs a real Save
  });

  test('discarding recovery starts a clean session', async ({ page }) => {
    await open(page);
    await dragPixels(page, [8, 5], [8, 20]);
    await autosave(page);

    await page.reload();
    await open(page);

    const dialog = page.getByRole('dialog', { name: 'Recover unsaved work' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Discard' }).click();
    await expect(dialog).toBeHidden();

    const state = await inspect(page, [8]);
    expect(state.alpha[8]).toBe(0);
    expect(state.isDirty).toBe(false);

    // reloading again offers nothing — the recovery data was cleaned up
    await page.reload();
    await open(page);
    await expect(page.getByRole('dialog', { name: 'Recover unsaved work' })).toBeHidden();
  });
});
