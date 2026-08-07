/// <reference types="node" />

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
});

const testListing = {
    petName: `Automation Tim `,
    petType: 'Cat',
    breed: 'British Shorthair',
    city: 'Jerusalem',
    description: 'Cat Created by Playwright E2E test',
    dateLost: '2026-08-01',
    contactEmail: 'test.Vasia@example.com',
    contactPhone: '0501234567',
};
test('owner can create a Lost Pet listing in English', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
        throw new Error(
            'E2E_USER_EMAIL and E2E_USER_PASSWORD must be defined'
        );
    };
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

        await expect(
        page.getByText('Vasia', { exact: true })
    ).toBeVisible();
       await page
        .getByRole('link', { name: 'Lost Pets' })
        .click();

    await expect(
        page.getByRole('heading', { name: 'Lost Pets' })
    ).toBeVisible();

await page
    .getByRole('button', {  name: '+ Report Lost Pet' })
    .click();


    const petTypeSelect = page.locator('#lost-type');

const cityInput = page.getByRole('textbox', {
    name: 'City *',
});


const petNameInput = page.getByRole('textbox', { name: 'Pet Name *' });

const dateFoundInput = page.getByRole('textbox', {
    name: 'Date Lost *',
});

const saveButton = page.getByRole('button', {
    name: 'Save Listing',
});
const descriptionInput = page.getByRole('textbox', {
    name: 'Description *',
});

const contactEmailInput = page.getByRole('textbox', {
    name: 'Contact Email',
});

const contactPhoneInput = page.getByRole('textbox', {
    name: 'Contact Phone',
});

const statusSelect = page.locator('#lost-status');

const languageSelect = page.locator('#lost-contentLanguage');

await petTypeSelect.selectOption('Cat');
await cityInput.fill(testListing.city);
await petNameInput.fill(testListing.petName);
await dateFoundInput.fill(testListing.dateLost);
await descriptionInput.fill(testListing.description);
await contactEmailInput.fill(testListing.contactEmail);
await contactPhoneInput.fill(testListing.contactPhone);

await expect(petTypeSelect).toHaveValue('Cat');
await expect(cityInput).toHaveValue(testListing.city);
await expect(petNameInput).toHaveValue(testListing.petName);
await expect(dateFoundInput).toHaveValue(testListing.dateLost);
await expect(descriptionInput).toHaveValue(testListing.description);
await expect(contactEmailInput).toHaveValue(testListing.contactEmail);
await expect(contactPhoneInput).toHaveValue(testListing.contactPhone);

await expect(statusSelect).toHaveValue('Open');
await expect(languageSelect).toHaveValue('en');

await saveButton.click();

const createdCard = page
    .locator('#listings-lost')
    .getByTestId('listing-card')
    .filter({
        has: page.getByText(testListing.petName, {
            exact: true,
        }),
    });

await expect(createdCard).toHaveCount(1);
await expect(createdCard).toContainText(testListing.city);
await expect(createdCard).toContainText(testListing.description);


});