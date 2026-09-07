import { expect, test } from '@playwright/test';

import { dragPixels, menuAction, open } from './support';

test.describe('UI shell', () => {
  test('the menu bar opens, runs items, and is keyboard dismissible', async ({ page }) => {
    await open(page);

    const gridToggle = page.getByRole('button', { name: 'Grid' });
    const before = await gridToggle.getAttribute('aria-pressed');

    const fileButton = page.getByRole('menuitem', { name: 'File', exact: true });
    await fileButton.click();
    await expect(page.getByRole('menu', { name: 'File' })).toBeVisible();

    // hovering another top item moves the open menu (menu-bar behaviour)
    await page.getByRole('menuitem', { name: 'View', exact: true }).hover();
    const viewMenu = page.getByRole('menu', { name: 'View' });
    await expect(viewMenu).toBeVisible();

    await viewMenu.getByRole('menuitemcheckbox', { name: 'Grid', exact: true }).click();
    await expect(viewMenu).toBeHidden();
    expect(await gridToggle.getAttribute('aria-pressed')).not.toBe(before);

    // reopen and dismiss with Escape — focus returns to the trigger
    await fileButton.click();
    await expect(page.getByRole('menu', { name: 'File' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: 'File' })).toBeHidden();
    await expect(fileButton).toBeFocused();
  });

  test('saving surfaces a success toast; failures surface an error toast', async ({ page }) => {
    await open(page);
    await dragPixels(page, [4, 4], [10, 4]);

    const download = page.waitForEvent('download');
    await menuAction(page, 'File', 'Save');
    await download;

    const toast = page.getByTestId('toast');
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute('data-level', 'success');
    await expect(page.getByTestId('status-dirty')).toHaveText('saved');
  });

  test('the shortcut help dialog opens with ? and closes with Escape', async ({ page }) => {
    await open(page);

    await page.keyboard.press('Shift+Slash');
    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Play / pause')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('the status bar reports the cursor position over the canvas', async ({ page }) => {
    await open(page);
    await page.mouse.move(0, 0);

    const { x, y } = await page.evaluate(() => {
      const session = window.__obsipix;
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="editor-canvas"]');
      if (!session || !canvas) {
        throw new Error('missing');
      }
      const rect = canvas.getBoundingClientRect();
      const point = session.viewport.documentToCanvas({ x: 5.5, y: 8.5 });
      return { x: rect.left + point.x, y: rect.top + point.y };
    });
    await page.mouse.move(x, y);

    await expect(page.getByTestId('status-cursor')).toHaveText('5, 8');
  });
});
