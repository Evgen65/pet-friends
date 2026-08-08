// Centralized configuration for the cloud smoke suite (tests/cloud/*).
// Every cloud test file imports its URLs/credentials from here — never
// hardcode them directly in a spec file.

export const FRONTEND_URL = process.env.CLOUD_FRONTEND_URL || 'https://pet-friends.onrender.com';
export const API_URL      = process.env.CLOUD_API_URL      || 'https://pet-friends-api.onrender.com';

// Dedicated cloud test account. Not committed anywhere — set these in your
// shell or a local .env before running the auth/create-listing/upload tests:
//   CLOUD_TEST_EMAIL=you@example.com
//   CLOUD_TEST_PASSWORD=your-test-password
// Tests that need them skip with a clear message when they're unset, rather
// than failing.
export const TEST_EMAIL    = process.env.CLOUD_TEST_EMAIL;
export const TEST_PASSWORD = process.env.CLOUD_TEST_PASSWORD;

export const HAS_TEST_CREDENTIALS = Boolean(TEST_EMAIL && TEST_PASSWORD);

// Render's free tier spins the service down when idle — the first request
// after a period of inactivity ("cold start") can take tens of seconds.
// Use this for the first request/assertion of a test; subsequent ones can
// use Playwright's normal default timeout.
export const COLD_START_TIMEOUT = 60_000;
