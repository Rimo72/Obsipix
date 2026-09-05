import { expect, test } from '@playwright/test';

test.describe('Obsipix shell', () => {
  test('loads and shows the editor shell', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Obsipix');
    await expect(page.getByText('Obsipix')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pencil' })).toBeVisible();
    await expect(page.getByTestId('status-dimensions')).toHaveText('32 × 32');
  });
});
