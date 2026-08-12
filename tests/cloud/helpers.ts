import { Page, Locator, expect } from '@playwright/test';
import { COLD_START_TIMEOUT } from './cloud-env';

// Shared helpers for the cloud smoke suite. These wrap real UI interactions
// (not direct API calls) so the tests exercise the same paths a real user
// would — matching how the manual browser smoke was performed.

// Reads the auth modal's currently-visible error text, if any — used to
// enrich signIn() failures with the same message a real user would see.
async function readAuthErrorText(page: Page): Promise<string | null> {
    const authError = page.locator('#authFormError');
    const visible = await authError.isVisible().catch(() => false);
    if (!visible) return null;
    const text = await authError.textContent().catch(() => null);
    return text?.trim() || null;
}

// Signs in through the real UI (not a direct API call — see the top-of-file
// note). Stabilized for Jenkins per Milestone 33B: the previous version
// clicked submit and immediately raced a 15s wait on #authActionsUser, with
// no visibility into *why* it was still hidden if the API/UI update lagged
// behind under CI load. This version pins down each stage of the flow
// (modal open → API response → UI update) and throws a diagnostic error at
// whichever stage actually failed, instead of a bare locator timeout.
export async function signIn(page: Page, email: string, password: string) {
    // Open the sign-in modal only if it isn't already open/on the right tab —
    // lets signIn() be called safely regardless of the auth UI's current state.
    const signInForm = page.locator('#authSignInForm');
    if (!(await signInForm.isVisible().catch(() => false))) {
        await page.getByTestId('auth-signin-button').click();
        await expect(signInForm).toBeVisible({ timeout: 15_000 });
    }

    await page.locator('#signin-email').fill(email);
    await page.locator('#signin-password').fill(password);

    // Start listening for the API response *before* clicking submit, so a
    // response that comes back fast can never be missed by a listener that
    // was attached too late.
    const signinResponsePromise = page.waitForResponse(
        response => response.url().includes('/api/auth/signin') && response.request().method() === 'POST',
        { timeout: 30_000 }
    );

    await signInForm.locator('button[type="submit"]').click();

    const response = await signinResponsePromise;

    if (response.status() !== 200) {
        const body = await response.text().catch(() => '<body unavailable>');
        const authErrorText = await readAuthErrorText(page);
        throw new Error(
            `signIn(${email}): POST /api/auth/signin returned ${response.status()} (expected 200).\n` +
            `Response body: ${body}\n` +
            `Visible auth error: ${authErrorText ?? '<none>'}`
        );
    }

    const userMenu = page.locator('#authActionsUser');
    try {
        // CI-friendly timeout: a Jenkins runner can take noticeably longer than
        // a local machine to apply the post-signin DOM update even after the
        // API has already responded 200.
        await expect(userMenu).toBeVisible({ timeout: 30_000 });
    } catch {
        const exists = await userMenu.count() > 0;
        const classAttr = exists ? await userMenu.getAttribute('class').catch(() => null) : null;
        const authErrorText = await readAuthErrorText(page);
        throw new Error(
            `signIn(${email}): sign-in API responded 200 but #authActionsUser never became ` +
            `visible within 30s.\n` +
            `#authActionsUser exists: ${exists}\n` +
            `#authActionsUser class: ${classAttr ?? '<n/a>'}\n` +
            `Visible auth error: ${authErrorText ?? '<none>'}\n` +
            `Current URL: ${page.url()}`
        );
    }
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
