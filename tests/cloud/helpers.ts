import { Page, Locator, expect } from '@playwright/test';
import { COLD_START_TIMEOUT } from './cloud-env';

// Shared helpers for the cloud smoke suite. These wrap real UI interactions
// (not direct API calls) so the tests exercise the same paths a real user
// would — matching how the manual browser smoke was performed.

export async function signIn(page: Page, email: string, password: string) {
    await page.getByTestId('auth-signin-button').click();
    await page.locator('#signin-email').fill(email);
    await page.locator('#signin-password').fill(password);
    await page.locator('#authSignInForm button[type="submit"]').click();
    await expect(page.locator('#authActionsUser')).toBeVisible({ timeout: 15_000 });
}

export async function signOut(page: Page) {
    await page.locator('#signOutBtn').click();
    await expect(page.getByTestId('auth-signin-button')).toBeVisible();
}

// Builds a test-data title that is unique per run and clearly identifiable
// as automation output — never collides with real/manual listings and is
// easy to spot (and never accidentally caught) by admin cleanup.
export function uniqueTitle(label: string) {
    return `Automation Cloud ${label} ${Date.now()}`;
}

type CreateFoundListingOptions = {
    title: string;
    city?: string;
    description?: string;
    photoPath?: string;
};

// Opens the "Found Pets" post form, fills the required fields, optionally
// attaches a photo, and submits. Leaves the caller on the Found Pets section
// with the form closed and the section reloaded from the API.
export async function createFoundListing(page: Page, opts: CreateFoundListingOptions) {
    const { title, city = 'Automation City', description = 'Created by the Playwright cloud smoke suite.', photoPath } = opts;

    await page.getByRole('link', { name: 'Found Pets' }).click();
    await page.locator('#showFormBtn-found').click();

    await page.locator('#found-type').selectOption('Cat');
    await page.locator('#found-title').fill(title);
    await page.locator('#found-city').fill(city);
    await page.locator('#found-date').fill(new Date().toISOString().slice(0, 10));
    await page.locator('#found-desc').fill(description);

    if (photoPath) {
        await page.locator('#photoInput-found').setInputFiles(photoPath);
        // Client-side resize (canvas → data URL) runs on the 'change' event —
        // wait for the preview to swap in before submitting.
        await expect(page.locator('#photo-preview-found')).toBeVisible();
    }

    await page.locator('#listingForm-found button[type="submit"]').click();
    await expect(page.locator('#form-found')).toBeHidden();
}

// Filters the Found Pets grid down to the given title via the search box
// (server-side query, debounced) and returns the single matching card.
export async function findFoundListingCard(page: Page, title: string) {
    const search = page.locator('#search-found');
    await search.fill(title);
    const card = page.locator('#listings-found .listing-card', { hasText: title });
    await expect(card).toHaveCount(1, { timeout: COLD_START_TIMEOUT });
    return card;
}

// Deletes the given Found Pets card via its own Delete button (exact-id
// cleanup — never a broad/admin cleanup) and confirms the native dialog.
export async function deleteFoundListingCard(page: Page, card: Locator) {
    page.once('dialog', dialog => dialog.accept());
    await card.getByRole('button', { name: 'Delete' }).click();
    await expect(card).toHaveCount(0);
}
