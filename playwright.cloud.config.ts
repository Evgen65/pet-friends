import { defineConfig, devices } from '@playwright/test';
import { FRONTEND_URL } from './tests/cloud/cloud-env';

// Cloud smoke config — runs tests/cloud/* against the already-deployed
// Render frontend/backend (see tests/cloud/cloud-env.ts for the URLs).
// Unlike playwright.config.ts, there is no webServer block: nothing local
// needs to be started, the site under test is already live.
export default defineConfig({
    testDir: './tests/cloud',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    // Render's free tier can cold-start on the first request of a run —
    // one retry absorbs that without masking a real failure.
    retries: 1,
    reporter: 'html',
    timeout: 90_000,

    use: {
        baseURL: FRONTEND_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 30_000,
        navigationTimeout: 60_000,
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        },
    ],
});
