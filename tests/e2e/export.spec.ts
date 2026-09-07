import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { dragPixels, menuAction, open } from './support';

async function exportViaDialog(
  page: import('@playwright/test').Page,
  configure: (dialog: import('@playwright/test').Locator) => Promise<void>,
): Promise<Buffer> {
  await menuAction(page, 'File', 'Export…');
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await expect(dialog).toBeVisible();
  await configure(dialog);
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export' }).click();
  return readFile(await (await download).path());
}

test.describe('expanded export', () => {
  test('exports the current frame as a scaled PNG', async ({ page }) => {
    await open(page);
    await dragPixels(page, [4, 4], [10, 4]);

    const bytes = await exportViaDialog(page, async (dialog) => {
      await dialog.getByLabel('Format').selectOption('png');
      await dialog.getByRole('button', { name: '2×' }).click();
      await expect(dialog.getByTestId('export-output-size')).toHaveText('Output: 64 × 64 px');
    });

    expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
    // IHDR width/height (big-endian at offsets 16, 20)
    expect(bytes.readUInt32BE(16)).toBe(64);
    expect(bytes.readUInt32BE(20)).toBe(64);
  });

  test('exports an animation as an animated GIF', async ({ page }) => {
    await open(page);
    await dragPixels(page, [4, 4], [10, 4]);
    await page.getByRole('button', { name: 'Add frame', exact: true }).click();
    await dragPixels(page, [4, 20], [10, 20]);

    const bytes = await exportViaDialog(page, async (dialog) => {
      await dialog.getByRole('tab', { name: 'Animation (GIF)' }).click();
      await expect(dialog.getByLabel('Format')).toHaveValue('gif');
    });

    expect(bytes.subarray(0, 6).toString('latin1')).toBe('GIF89a');
    expect(bytes.includes(Buffer.from('NETSCAPE2.0'))).toBe(true);
    expect(bytes[bytes.length - 1]).toBe(0x3b); // trailer
  });

  test('exports a horizontal sprite sheet', async ({ page }) => {
    await open(page);
    await dragPixels(page, [2, 2], [2, 2]);
    await page.getByRole('button', { name: 'Add frame', exact: true }).click();
    await dragPixels(page, [8, 8], [8, 8]);

    const bytes = await exportViaDialog(page, async (dialog) => {
      await dialog.getByRole('tab', { name: 'Sprite sheet' }).click();
      await dialog.getByRole('button', { name: 'Horizontal' }).click();
      await expect(dialog.getByTestId('export-output-size')).toHaveText('Output: 64 × 32 px');
    });

    expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
    expect(bytes.readUInt32BE(16)).toBe(64);
    expect(bytes.readUInt32BE(20)).toBe(32);
  });
});
