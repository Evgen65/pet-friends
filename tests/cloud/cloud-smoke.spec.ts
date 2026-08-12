// Playwright cloud smoke suite — Milestone 27.
//
// Runs against the already-deployed Pet Friends site (Render frontend +
// Render backend + Aiven MySQL + Cloudinary), not against anything started
// locally. Run with:
//   npx playwright test -c playwright.cloud.config.ts
//   npm run test:cloud
//
// URLs and the optional dedicated test-user credentials come from
// tests/cloud/cloud-env.ts (env vars, no secrets in this repo — see that
// file's comments for the variable names).
import { test, expect } from '@playwright/test';
import {
    API_URL,
    TEST_EMAIL,
    TEST_PASSWORD,
    HAS_TEST_CREDENTIALS,
    COLD_START_TIMEOUT,
} from './cloud-env';
import {
    signIn,
    signOut,
    uniqueTitle,
    createFoundListing,
    findFoundListingCard,
    deleteFoundListingCard,
} from './helpers';

// ── Test 1 — Cloud backend health ───────────────────────────────────────────

test.describe('Cloud backend health', () => {
    test('health, health/db, listings and stories endpoints respond 200', async ({ request }) => {
        // First call absorbs a possible Render cold start.
        const health = await request.get(`${API_URL}/api/health`, { timeout: COLD_START_TIMEOUT });
        expect(health.status()).toBe(200);

        const healthDb = await request.get(`${API_URL}/api/health/db`);
        expect(healthDb.status()).toBe(200);

        const listings = await request.get(`${API_URL}/api/listings?limit=1`);
        expect(listings.status()).toBe(200);

        const stories = await request.get(`${API_URL}/api/stories`);
        expect(stories.status()).toBe(200);
    });
});

// ── Test 2 — Cloud frontend opens ───────────────────────────────────────────

test.describe('Cloud frontend', () => {
    test('main page loads and shows navigation sections', async ({ page }) => {
        // Browsers auto-request these regardless of whether the app links to
        // them; the app never references them, so a 404 here is not a real
        // static-deploy problem — see index.html, which has no <link
        // rel="icon"/apple-touch-icon>. Any other 404 (e.g. assets/images/*,
        // app.js, styles.css) is a genuine missing-asset problem and must fail.
        const HARMLESS_404_RE = /\/(favicon\.ico|apple-touch-icon(-precomposed)?\.png)$/;

        // Chrome logs a generic, URL-less "Failed to load resource: the server
        // responded with a status of 404 ()" console error for every failed
        // network request. It carries no information the 'response' listener
        // below doesn't already capture with the actual URL/status/type
        // attached, so it's dropped here to avoid a duplicate, useless entry —
        // any real failed request still fails the test via failedResponses.
        const GENERIC_RESOURCE_ERROR_RE = /^Failed to load resource:/;

        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() !== 'error') return;
            if (GENERIC_RESOURCE_ERROR_RE.test(msg.text())) return;
            const location = msg.location()?.url;
            consoleErrors.push(
                `[console.${msg.type()}] ${msg.text()}${location ? ` (${location})` : ''}`
            );
        });

        const failedResponses: string[] = [];
        page.on('response', response => {
            if (response.status() < 400) return;
            if (HARMLESS_404_RE.test(new URL(response.url()).pathname)) return;
            failedResponses.push(
                `[${response.status()}] ${response.request().resourceType()} ${response.url()}`
            );
        });

        await page.goto('/', { waitUntil: 'domcontentloaded' });

        // Cold start: give the very first paint extra time.
        await expect(page.locator('.logo')).toHaveText('🐾 Pet Friends', { timeout: COLD_START_TIMEOUT });

        await expect(page.getByRole('link', { name: 'Found Pets' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Lost Pets' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Pets for Home' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'I Want to Adopt' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Pet Stories' })).toBeVisible();

        const problems = [...failedResponses, ...consoleErrors];
        expect(problems, `Unexpected frontend problems:\n${problems.join('\n')}`).toEqual([]);
    });
});

// ── Test 3 — Language smoke ─────────────────────────────────────────────────

test.describe('Language smoke', () => {
    test('RU and HE switch UI text and direction, then back to EN', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.logo')).toBeVisible({ timeout: COLD_START_TIMEOUT });

        await page.getByTestId('language-ru').click();
        await expect(page.getByRole('link', { name: 'Главная' })).toBeVisible();

        await page.getByTestId('language-he').click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.getByRole('link', { name: 'בית' })).toBeVisible();

        await page.getByTestId('language-en').click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
        await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    });
});

// ── Test 4 — Auth smoke ─────────────────────────────────────────────────────
// Skips (does not fail) when no dedicated cloud test user is configured.
//
// Milestone 33B note: this test and the two below it (Create listing smoke,
// Upload smoke) all sign in as the same dedicated cloud test user and, with
// fullyParallel, may run concurrently. This is safe to leave parallel: each
// test gets its own isolated browser context, signin issues an independent
// JWT per call (no server-side single-session invalidation), and each test
// only touches its own uniquely-titled listing — there's no shared state for
// concurrent signins to collide on, so forcing the suite (or just these
// three) to run serial would trade away parallel runtime for no stability
// gain. The one real shared resource is the backend's per-IP signin rate
// limit (20 req/15min) — comfortably above what this suite's retries can
// produce, but worth knowing if a future test bumps signin call volume.

test.describe('Auth smoke', () => {
    test('sign in and sign out with the dedicated cloud test user', async ({ page }) => {
        test.skip(!HAS_TEST_CREDENTIALS,
            'CLOUD_TEST_EMAIL / CLOUD_TEST_PASSWORD not set — skipping auth smoke test.');

        await page.goto('/');
        await expect(page.getByTestId('auth-signin-button')).toBeVisible({ timeout: COLD_START_TIMEOUT });

        await signIn(page, TEST_EMAIL!, TEST_PASSWORD!);
        await expect(page.locator('#authActionsGuest')).toBeHidden();

        await signOut(page);
        await expect(page.locator('#authActionsUser')).toBeHidden();
    });
});

// ── Test 5 — Create listing smoke, with cleanup ─────────────────────────────
// Skips when no dedicated cloud test user is configured: creating as a guest
// would leave a listing with no owner, and the UI only exposes Delete to the
// listing's owner (or an admin) — we would have no reliable, exact-id way to
// clean it back up, which the test-data rules for this milestone require.

test.describe('Create listing smoke', () => {
    test('creates a Found Pet listing, verifies it, then deletes it', async ({ page }) => {
        test.skip(!HAS_TEST_CREDENTIALS,
            'CLOUD_TEST_EMAIL / CLOUD_TEST_PASSWORD not set — skipping create-listing smoke test.');

        const title = uniqueTitle('Cat');

        await page.goto('/');
        await expect(page.getByTestId('auth-signin-button')).toBeVisible({ timeout: COLD_START_TIMEOUT });
        await signIn(page, TEST_EMAIL!, TEST_PASSWORD!);

        await createFoundListing(page, { title });

        const card = await findFoundListingCard(page, title);
        await expect(card).toBeVisible();

        await deleteFoundListingCard(page, card);
        // findFoundListingCard already re-searched by the unique title, so a
        // zero count here means only this test's own listing was removed.
    });
});

// ── Test 6 — Upload smoke, with cleanup ─────────────────────────────────────

test.describe('Upload smoke', () => {
    test('creates a listing with a photo and the card displays an image', async ({ page }) => {
        test.skip(!HAS_TEST_CREDENTIALS,
            'CLOUD_TEST_EMAIL / CLOUD_TEST_PASSWORD not set — skipping upload smoke test.');

        const title = uniqueTitle('Upload');

        await page.goto('/');
        await expect(page.getByTestId('auth-signin-button')).toBeVisible({ timeout: COLD_START_TIMEOUT });
        await signIn(page, TEST_EMAIL!, TEST_PASSWORD!);

        await createFoundListing(page, {
            title,
            photoPath: 'tests/fixtures/test-pet.png',
        });

        const card = await findFoundListingCard(page, title);
        const img = card.locator('.card-photo img');

        // A successful Cloudinary upload gives an absolute res.cloudinary.com
        // URL; the placeholder SVG (no photo / failed upload) never does.
        await expect(img).toHaveAttribute('src', /res\.cloudinary\.com/, { timeout: COLD_START_TIMEOUT });

        await deleteFoundListingCard(page, card);
    });
});
