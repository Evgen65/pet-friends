import { test, expect } from '@playwright/test';
import process from 'process';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
});

test('guest can open the sign in form', async ({ page }) => {
    const signInButton = page.getByTestId('auth-signin-button');

    await expect(signInButton).toBeVisible();

    await signInButton.click();

    const emailInput = page.getByRole('textbox', { name: 'Email' });
    const passwordInput = page.getByRole('textbox', { name: 'Password' });

    const submitButton = page
         .locator('#authSignInForm')
        .getByRole('button', { name: 'Sign in' });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
});
test('guest can enter email and password', async ({ page }) => {
    await page.getByTestId('auth-signin-button').click();

    const emailInput = page.getByRole('textbox', { name: 'Email' });
    const passwordInput = page.getByRole('textbox', { name: 'Password' });

    await emailInput.fill('student@example.com');
    await passwordInput.fill('TestPassword123!');

    await expect(emailInput).toHaveValue('student@example.com');
    await expect(passwordInput).toHaveValue('TestPassword123!');
});
test('password field masks entered value', async ({ page }) => {
    await page.getByTestId('auth-signin-button').click();

    const passwordInput = page.getByRole('textbox', { name: 'Password' });

    await expect(passwordInput).toHaveAttribute('type', 'password');

    await passwordInput.fill('SecretPassword123!');

    await expect(passwordInput).toHaveValue('SecretPassword123!');
});
test('invalid credentials show an error message', async ({ page }) => {
    await page.getByTestId('auth-signin-button').click();

    const emailInput = page.getByRole('textbox', { name: 'Email' });
    const passwordInput = page.getByRole('textbox', { name: 'Password' });

    const submitButton = page
        .locator('#authSignInForm')
        .getByRole('button', { name: 'Sign in' });

    await emailInput.fill('not-registered-user@example.com');
    await passwordInput.fill('WrongPassword123!');

    await submitButton.click();

    const errorMessage = page.getByText(
    'Invalid email or password',
    { exact: true }
);

await expect(errorMessage).toBeVisible();
await expect(errorMessage).toHaveText('Invalid email or password');
await expect(
    page.getByTestId('auth-signin-button')
).toBeVisible();

await expect(
    page.getByTestId('auth-signup-button')
).toBeVisible();
});

test('sign in fields have correct HTML validation attributes', async ({ page }) => {
    await page.getByTestId('auth-signin-button').click();

    const emailInput = page.getByRole('textbox', { name: 'Email' });
    const passwordInput = page.getByRole('textbox', { name: 'Password' });

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');

    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toHaveAttribute('type', 'password');
});

test('registered user can sign in with valid credentials', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
        throw new Error(
            'E2E_USER_EMAIL and E2E_USER_PASSWORD must be defined'
        );
    }

    await page.getByTestId('auth-signin-button').click();

    const emailInput = page.getByRole('textbox', { name: 'Email' });
    const passwordInput = page.getByRole('textbox', { name: 'Password' });

    const submitButton = page
        .locator('#authSignInForm')
        .getByRole('button', { name: 'Sign in' });

    await emailInput.fill(email);
    await passwordInput.fill(password);

    await submitButton.click();

   const currentUser = page.getByText('Vasia', { exact: true });
const signOutButton = page.getByRole('button', { name: 'Sign out' });

await expect(currentUser).toBeVisible();
await expect(signOutButton).toBeVisible();

await expect(
    page.getByTestId('auth-signin-button')
).toBeHidden();

await expect(
    page.getByTestId('auth-signup-button')
).toBeHidden();
});

test('registered user can sign out', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
        throw new Error(
            'E2E_USER_EMAIL and E2E_USER_PASSWORD must be defined'
        );
    }

    await page.getByTestId('auth-signin-button').click();

    const emailInput = page.getByRole('textbox', { name: 'Email' });
    const passwordInput = page.getByRole('textbox', { name: 'Password' });

    const submitButton = page
        .locator('#authSignInForm')
        .getByRole('button', { name: 'Sign in' });

    await emailInput.fill(email);
    await passwordInput.fill(password);
    await submitButton.click();

    const currentUser = page.getByText('Vasia', { exact: true });
    const signOutButton = page.getByRole('button', { name: 'Sign out' });

    await expect(currentUser).toBeVisible();
    await expect(signOutButton).toBeVisible();

    await signOutButton.click();

    await expect(
        page.getByTestId('auth-signin-button')
    ).toBeVisible();

    await expect(
        page.getByTestId('auth-signup-button')
    ).toBeVisible();

    await expect(currentUser).toBeHidden();
    await expect(signOutButton).toBeHidden();
});

test('authenticated session persists after page reload', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
        throw new Error(
            'E2E_USER_EMAIL and E2E_USER_PASSWORD must be defined'
        );
    }

    await page.getByTestId('auth-signin-button').click();

    const emailInput = page.getByRole('textbox', { name: 'Email' });
    const passwordInput = page.getByRole('textbox', { name: 'Password' });

    const submitButton = page
        .locator('#authSignInForm')
        .getByRole('button', { name: 'Sign in' });

    await emailInput.fill(email);
    await passwordInput.fill(password);
    await submitButton.click();

    const currentUser = page.getByText('Vasia', { exact: true });
    const signOutButton = page.getByRole('button', { name: 'Sign out' });

    await expect(currentUser).toBeVisible();
    await expect(signOutButton).toBeVisible();

    await page.reload();

    await expect(currentUser).toBeVisible();
    await expect(signOutButton).toBeVisible();

    await expect(
        page.getByTestId('auth-signin-button')
    ).toBeHidden();

    await expect(
        page.getByTestId('auth-signup-button')
    ).toBeHidden();
});




