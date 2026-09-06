import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { dragPixels, inspect, open } from './support';

test.describe('persistence', () => {
  test('save an .obsipix project and reopen it with the artwork intact', async ({ page }) => {
    await open(page);

    // draw something recognisable
    await dragPixels(page, [5, 5], [20, 5]);
    let state = await inspect(page);
    expect(state.alpha[12]).toBeGreaterThan(0);
    expect(state.isDirty).toBe(true);

    // --- save ---
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.obsipix$/);
    const savedPath = await download.path();
    const bytes = await readFile(savedPath);

    expect(bytes.subarray(0, 7).toString('latin1')).toBe('OBSIPIX');
    await expect(page.getByTestId('status-dirty')).toHaveText('saved');

    // --- start fresh ---
    await page.reload();
    await open(page);
    state = await inspect(page);
    expect(state.alpha[12]).toBe(0); // blank canvas

    // --- open the saved file ---
    page.once('filechooser', (chooser) => {
      void chooser.setFiles({
        name: 'reopened.obsipix',
        mimeType: 'application/x-obsipix',
        buffer: bytes,
      });
    });
    await page.getByRole('button', { name: 'Open', exact: true }).click();

    await page.waitForFunction(() => {
      const session = window.__obsipix;
      const buffer = session?.document.resolveBuffer(session.document.layers.activeLayerId);
      return !!buffer && buffer.getPixel(12, 5).a > 0;
    });

    state = await inspect(page);
    expect(state.alpha[5]).toBeGreaterThan(0);
    expect(state.alpha[12]).toBeGreaterThan(0);
    expect(state.alpha[20]).toBeGreaterThan(0);
    expect(state.isDirty).toBe(false); // a freshly opened project is clean
    expect(state.canUndo).toBe(false); // history does not survive save/load
  });

  test('rejects a corrupt file without disturbing the current document', async ({ page }) => {
    await open(page);
    await dragPixels(page, [8, 5], [8, 5]);
    expect((await inspect(page, [8])).alpha[8]).toBeGreaterThan(0);

    // there are unsaved changes — accept the "discard?" confirmation
    page.on('dialog', (dialog) => {
      void dialog.accept();
    });
    page.once('filechooser', (chooser) => {
      void chooser.setFiles({
        name: 'broken.obsipix',
        mimeType: 'application/x-obsipix',
        buffer: Buffer.from('OBSIPIX\0 not a real file at all'),
      });
    });
    await page.getByRole('button', { name: 'Open', exact: true }).click();

    await expect(page.getByTestId('file-error')).toBeVisible();
    // current artwork is untouched
    const after = await inspect(page, [8]);
    expect(after.alpha[8]).toBeGreaterThan(0);
  });
});
