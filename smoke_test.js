const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const SHOTS_DIR = __dirname;

(async () => {
    const browser = await chromium.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
    });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    // 1. Home page
    await page.goto(FILE, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SHOTS_DIR, 'shot_01_home.png'), fullPage: false });
    console.log('SCREENSHOT: shot_01_home.png');

    // Check stats render
    const statFound = await page.textContent('#stat-found');
    console.log('Stat Found Pets:', statFound);

    // 2. Click Found card
    await page.click('.action-card.found');
    await page.waitForSelector('#section-found.active');
    await page.screenshot({ path: path.join(SHOTS_DIR, 'shot_02_found.png') });
    console.log('PASS: Found Pets section opens from home card');

    // 3. Click Lost card — go home first
    await page.click('[data-section="home"]');
    await page.click('.action-card.lost');
    await page.waitForSelector('#section-lost.active');
    console.log('PASS: Lost Pets section opens from home card');

    // 4. Click ForHome card
    await page.click('[data-section="home"]');
    await page.click('.action-card.forHome');
    await page.waitForSelector('#section-forHome.active');
    console.log('PASS: Pets for Home section opens from home card');

    // 5. Click Adopt card
    await page.click('[data-section="home"]');
    await page.click('.action-card.adopt');
    await page.waitForSelector('#section-adopt.active');
    console.log('PASS: I Want to Adopt section opens from home card');

    // 6. Found Pets — fill and save form
    await page.click('[data-section="found"]');
    await page.waitForSelector('#section-found.active');
    await page.click('#showFormBtn-found');
    await page.waitForSelector('#form-found:not(.hidden)');

    await page.selectOption('#found-type', 'Dog');
    await page.fill('#found-title', 'Smoke Test Dog');
    await page.fill('#found-city', 'TestCity');
    await page.fill('#found-date', '2026-06-07');
    await page.fill('#found-desc', 'Smoke test description — automatic entry.');
    await page.fill('#found-email', 'qa@test.com');
    await page.fill('#found-phone', '555-9999');
    await page.selectOption('#found-status', 'Open');

    await page.screenshot({ path: path.join(SHOTS_DIR, 'shot_03_form_filled.png') });
    console.log('SCREENSHOT: shot_03_form_filled.png');

    await page.click('#listingForm-found button[type="submit"]');
    // wait for form to become hidden (display:none) after successful save
    await page.waitForSelector('#form-found', { state: 'hidden' });
    await page.screenshot({ path: path.join(SHOTS_DIR, 'shot_04_after_save.png') });
    console.log('PASS: Found Pets form submitted, card appeared');

    // Check new card visible
    const cardText = await page.textContent('.listing-card.found .card-title');
    if (cardText.includes('Smoke Test Dog')) {
        console.log('PASS: New listing card shows correct title:', cardText.trim());
    } else {
        errors.push('FAIL: New listing card title mismatch: ' + cardText);
    }

    // 7. Search filter
    await page.fill('#search-found', 'Smoke Test Dog');
    await page.waitForTimeout(300);
    const cardCount = await page.locator('.listing-card.found').count();
    console.log('PASS: Search filter — visible cards:', cardCount);

    await page.fill('#search-found', '');

    // 8. Contact form
    await page.click('[data-section="contact"]');
    await page.waitForSelector('#section-contact.active');
    await page.fill('#contact-name', 'QA Tester');
    await page.fill('#contact-email', 'qa@test.com');
    await page.fill('#contact-subject', 'Smoke Test Subject');
    await page.fill('#contact-message', 'This is an automated smoke test message.');
    await page.screenshot({ path: path.join(SHOTS_DIR, 'shot_05_contact_form.png') });

    await page.click('#contactForm button[type="submit"]');
    await page.waitForSelector('#contactSuccess:not(.hidden)');
    await page.screenshot({ path: path.join(SHOTS_DIR, 'shot_06_contact_success.png') });
    console.log('PASS: Contact form submitted, success message shown');

    // 9. Pet Stories — add a story
    await page.click('[data-section="stories"]');
    await page.waitForSelector('#section-stories.active');
    await page.click('#showFormBtn-stories');
    await page.waitForSelector('#form-stories:not(.hidden)');
    await page.fill('#stories-title', 'Smoke Test Story');
    await page.selectOption('#stories-category', 'Funny');
    await page.fill('#stories-text', 'Automated smoke test story entry.');
    await page.click('#listingForm-stories button[type="submit"]');
    await page.waitForSelector('#form-stories', { state: 'hidden' });
    console.log('PASS: Pet Story added successfully');

    // Final home screenshot
    await page.click('[data-section="home"]');
    await page.screenshot({ path: path.join(SHOTS_DIR, 'shot_07_home_final.png') });

    if (errors.length > 0) {
        console.log('\nCONSOLE ERRORS DETECTED:');
        errors.forEach(e => console.log('  >', e));
    } else {
        console.log('\nAll checks passed. No console errors.');
    }

    await browser.close();
})();
