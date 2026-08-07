/// <reference types="node" />

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    // Каждый тест начинает работу как гость.
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
});

test('owner can delete a Lost Pet listing in English', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
        throw new Error(
            'E2E_USER_EMAIL and E2E_USER_PASSWORD must be defined'
        );
    }

    const petName = 'Automation Tim Updated';

    // LOGIN
    await page.getByTestId('auth-signin-button').click();

    await page
        .getByRole('textbox', { name: 'Email' })
        .fill(email);

    await page
        .getByRole('textbox', { name: 'Password' })
        .fill(password);

    await page
        .locator('#authSignInForm')
        .getByRole('button', { name: 'Sign in' })
        .click();

    await expect(
        page.getByText('Vasia', { exact: true })
    ).toBeVisible();

    // OPEN LOST PETS
    await page
        .getByRole('link', { name: 'Lost Pets' })
        .click();

    await expect(
        page.getByRole('heading', { name: 'Lost Pets' })
    ).toBeVisible();

    // SEARCH FOR THE TARGET LISTING
    const searchInput = page.getByRole('textbox', {
        name: 'Search by name, city, description…',
    });

    await searchInput.fill(petName);

    // FIND THE EXACT CARD
    const targetCard = page
        .locator('#listings-lost')
        .getByTestId('listing-card')
        .filter({
            has: page.getByText(petName, {
                exact: true,
            }),
        });

    // Мы ожидаем ровно одну подходящую карточку.
    await expect(targetCard).toHaveCount(1);
    await expect(targetCard).toBeVisible();

    // DELETE
    // Обработчик необходимо установить до нажатия Delete.
    page.once('dialog', async dialog => {
        await dialog.accept();
    });

    await targetCard
        .getByRole('button', { name: 'Delete' })
        .click();

    // VERIFY DELETE
    await expect(targetCard).toHaveCount(0);

    await expect(
        page.getByText(petName, { exact: true })
    ).toHaveCount(0);
});