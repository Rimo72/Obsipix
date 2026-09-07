import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { dragPixels, inspect, menuAction, open } from './support';

test.describe('reliability', () => {
  test('artwork survives repeated save / reload / reopen cycles', async ({ page }) => {
    await open(page);
    await dragPixels(page, [5, 5], [24, 5]);

    let bytes: Buffer | null = null;
    for (let cycle = 0; cycle < 4; cycle += 1) {
      const download = page.waitForEvent('download');
      await menuAction(page, 'File', 'Save');
      bytes = await readFile(await (await download).path());

      await page.reload();
      await open(page);
      expect((await inspect(page)).alpha[12]).toBe(0); // fresh session

      const buffer = bytes;
      page.once('filechooser', (chooser) => {
        void chooser.setFiles({
          name: `cycle-${String(cycle)}.obsipix`,
          mimeType: 'application/x-obsipix',
          buffer,
        });
      });
      await menuAction(page, 'File', 'Open…');
      await page.waitForFunction(() => {
        const session = window.__obsipix;
        if (!session) {
          return false;
        }
        const layerId = session.document.layers.activeLayerId;
        return (session.document.resolveBuffer(layerId)?.getPixel(12, 5).a ?? 0) > 0;
      });
    }

    const state = await inspect(page);
    expect(state.alpha[5]).toBeGreaterThan(0);
    expect(state.alpha[12]).toBeGreaterThan(0);
    expect(state.alpha[20]).toBeGreaterThan(0);
    expect(state.isDirty).toBe(false);
  });

  test('a corrupt recovery record is ignored without a crash', async ({ page }) => {
    await open(page);

    // plant junk under the recovery key
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const request = indexedDB.open('obsipix', 1);
          request.onupgradeneeded = () => {
            request.result.createObjectStore('recovery');
          };
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('recovery', 'readwrite');
            tx.objectStore('recovery').put(
              { bytes: new Uint8Array([1, 2, 3]), savedAt: 1 },
              'current',
            );
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
          };
        }),
    );

    await page.reload();
    await open(page);

    // no recovery dialog, editor is usable
    await expect(page.getByRole('dialog', { name: 'Recover unsaved work' })).toBeHidden();
    await dragPixels(page, [3, 5], [9, 5]);
    expect((await inspect(page, [3])).alpha[3]).toBeGreaterThan(0);
  });
});
