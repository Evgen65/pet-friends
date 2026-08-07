// Playwright smoke tests for the Pet Friends frontend.
//
// Prerequisites (not started automatically by this config):
//   1. MySQL must be running and reachable with the credentials in .env
//   2. Backend API:  npm run server        (http://localhost:3000)
// Then run:
//   npm run test:e2e
//
// The frontend static file server (scripts/static-server.js) IS started
// automatically by playwright.config.ts's `webServer`.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
});

test('home page opens and shows the app title', async ({ page }) => {
    await expect(page.locator('.logo')).toHaveText('🐾 Pet Friends');
    await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
});

test('main navigation sections are visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Found Pets' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Lost Pets' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pets for Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'I Want to Adopt' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pet Stories' })).toBeVisible();
});

test('guest sees sign in and sign up controls', async ({ page }) => {
    await expect(page.getByTestId('auth-signin-button')).toBeVisible();
    await expect(page.getByTestId('auth-signup-button')).toBeVisible();
});

test('language switching updates labels and RTL direction', async ({ page }) => {
    await page.getByTestId('language-ru').click();
    await expect(page.getByRole('link', { name: 'Главная' })).toBeVisible();

    await page.getByTestId('language-he').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('listing details modal opens and closes from Found Pets', async ({ page }) => {
    await page.getByRole('link', { name: 'Found Pets' }).click();

    const firstCard = page.locator('#listings-found .listing-card').first();
    const emptyState = page.locator('#empty-found:not(.hidden)');

    await expect(firstCard.or(emptyState)).toBeVisible();

    if (await firstCard.isVisible().catch(() => false)) {
        await firstCard.getByTestId('view-details-button').click();

        const modal = page.getByTestId('listing-details-modal');
        await expect(modal).toBeVisible();

        await page.locator('#listingDetailsClose').click();
        await expect(modal).toBeHidden();
    }
});

test('filter controls are present on Found Pets', async ({ page }) => {
    await page.getByRole('link', { name: 'Found Pets' }).click();

    await expect(page.locator('#filter-type-found')).toBeVisible();
    await expect(page.locator('#filter-city-found')).toBeVisible();
    await expect(page.locator('#filter-status-found')).toBeVisible();
    await expect(page.locator('#filter-sort-found')).toBeVisible();
});

test('Pet Stories section shows stories or an empty state', async ({ page }) => {
    await page.getByRole('link', { name: 'Pet Stories' }).click();

    const firstStory = page.locator('#listings-stories .listing-card').first();
    const emptyState = page.locator('#empty-stories:not(.hidden)');

    await expect(firstStory.or(emptyState)).toBeVisible();
});
