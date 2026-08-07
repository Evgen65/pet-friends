import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
});

const testListing = {
    petName: `Automation Rex ${Date.now()}`,
    petType: 'Dog',
    breed: 'Labrador',
    city: 'Haifa',
    description: 'Created by Playwright E2E test',
    dateFound: '2026-07-26',
    contactEmail: 'test.Vasia@example.com',
    contactPhone: '0501234567',
};

test('owner can create a Found Pet listing in English', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
        throw new Error(
            'E2E_USER_EMAIL and E2E_USER_PASSWORD must be defined'
        );
    }

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

    await page
        .getByRole('link', { name: 'Found Pets' })
        .click();

    await expect(
        page.getByRole('heading', { name: 'Found Pets' })
    ).toBeVisible();

await page
    .getByRole('button', { name: '+ Post Found Pet' })
    .click();

const petTypeSelect = page.locator('#found-type');

const cityInput = page.getByRole('textbox', {
    name: 'City *',
});

const petNameInput = page.getByRole('textbox', {
    name: 'Pet Name / Title *',
});

const dateFoundInput = page.getByRole('textbox', {
    name: 'Date Found *',
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

const statusSelect = page.locator('#found-status');

const languageSelect = page.locator('#found-contentLanguage');

await petTypeSelect.selectOption('Dog');
await cityInput.fill(testListing.city);
await petNameInput.fill(testListing.petName);
await dateFoundInput.fill(testListing.dateFound);
await descriptionInput.fill(testListing.description);
await contactEmailInput.fill(testListing.contactEmail);
await contactPhoneInput.fill(testListing.contactPhone);

await expect(petTypeSelect).toHaveValue('Dog');
await expect(cityInput).toHaveValue(testListing.city);
await expect(petNameInput).toHaveValue(testListing.petName);
await expect(dateFoundInput).toHaveValue(testListing.dateFound);
await expect(descriptionInput).toHaveValue(testListing.description);
await expect(contactEmailInput).toHaveValue(testListing.contactEmail);
await expect(contactPhoneInput).toHaveValue(testListing.contactPhone);

await expect(statusSelect).toHaveValue('Open');
await expect(languageSelect).toHaveValue('en');
await saveButton.click();

const createdCard = page
    .getByTestId('listing-card')
    .filter({
        has: page.getByText(testListing.petName, {
            exact: true,
        }),
    });

await expect(createdCard).toHaveCount(1);
await expect(createdCard).toBeVisible();
await expect(createdCard).toContainText(testListing.city);
await expect(createdCard).toContainText(testListing.description);

// Click the "Edit" button on the created card
await createdCard
    .getByRole('button', { name: 'Edit' })
    .click();


const updatedListing = {
    petName: `${testListing.petName} Updated`,
    city: 'Tel Aviv',
    description: 'Updated by Playwright E2E test',
}; 
const editPetNameInput = page.getByRole('textbox', {
    name: 'Pet Name / Title *',
});

const editCityInput = page.getByRole('textbox', {
    name: 'City *',
});

const editDescriptionInput = page.getByRole('textbox', {
    name: 'Description *',
});

const updateButton = page.getByRole('button', {
    name: 'Update Listing',
}); 

await expect(editPetNameInput).toHaveValue(testListing.petName);
await expect(editCityInput).toHaveValue(testListing.city);
await expect(editDescriptionInput).toHaveValue(testListing.description); 

await editPetNameInput.fill(updatedListing.petName);
await editCityInput.fill(updatedListing.city);
await editDescriptionInput.fill(updatedListing.description);

await updateButton.click();

const updatedCard = page
    .getByTestId('listing-card')
    .filter({
        has: page.getByText(updatedListing.petName, {
            exact: true,
        }),
    });

await expect(updatedCard).toHaveCount(1);
await expect(updatedCard).toBeVisible();
await expect(updatedCard).toContainText(updatedListing.city);
await expect(updatedCard).toContainText(updatedListing.description);

await expect(
    page.getByText(testListing.petName, { exact: true })
).toHaveCount(0);

await expect(updatedCard).toHaveCount(1);
await expect(updatedCard).toBeVisible();
await expect(updatedCard).toContainText(updatedListing.city);
await expect(updatedCard).toContainText(updatedListing.description);

await expect(
    page.getByText(testListing.petName, { exact: true })
).toHaveCount(0);

// DELETE
page.once('dialog', async dialog => {
    await dialog.accept();
});

await updatedCard
    .getByRole('button', { name: 'Delete' })
    .click();

await expect(updatedCard).toHaveCount(0);

await expect(
    page.getByText(updatedListing.petName, { exact: true })
).toHaveCount(0);


});
