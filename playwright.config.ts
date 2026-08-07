import { defineConfig, devices } from '@playwright/test';

// The frontend is a static site (index.html + app.js) that talks to the
// backend API at http://localhost:3000 via absolute fetch() URLs (see
// scripts/data/*.js). Playwright only needs to serve the static files —
// the backend/MySQL must already be running separately (see README note
// in tests/e2e/smoke.spec.ts and the milestone docs).
const FRONTEND_PORT = 5500;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: 'html',

    use: {
        baseURL: FRONTEND_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            // Reuse the system-installed Chrome (already used by smoke_test.js)
            // instead of downloading a separate Playwright browser binary.
            use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        },
    ],

    webServer: {
        command: `node scripts/static-server.js ${FRONTEND_PORT}`,
        url: FRONTEND_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 10_000,
    },
});
