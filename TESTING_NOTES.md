# TESTING_NOTES.md — Pet Friends MVP v1

> Practice QA site for animal lovers. Pure front-end SPA; all data stored in `localStorage`.
> No backend, no auth, no network calls. Tested manually in a desktop browser.

---

## 1. Scope of Testing

### In scope
| Area | Description |
|---|---|
| Navigation | Header nav links, action cards on Home, inline links in Contact |
| Home stats | Counters update after every CRUD operation |
| Found Pets | Full CRUD + search + filters |
| Lost Pets | Full CRUD + search + filters |
| Pets for Home | Full CRUD + search + filters |
| I Want to Adopt | Full CRUD + search + filters |
| Pet Stories | Full CRUD + search + category filter |
| Contact form | Validation, success state, reset |
| Form validation | Required fields, email format, error messages |
| Toast notifications | Appear on save / update / delete; auto-dismiss |
| Empty states | Shown when no records match (fresh data or all filtered out) |
| City filter | Dynamically populated from existing listings |
| Mobile nav | Hamburger toggle; closes on outside click |
| localStorage | Data persists after page reload; seed data loads once |

### Out of scope (MVP)
- Image upload / real media display (URL-only, `onerror` removes broken images)
- Email / phone delivery (mailto / tel links only)
- Authentication, user accounts, roles
- Server-side persistence
- Cross-browser testing beyond the primary desktop browser
- Accessibility audit (WCAG compliance)
- Performance / load testing

---

## 2. Smoke Checklist

Run this first. If any item fails, stop and fix before deeper testing.

- [ ] Page loads without console errors
- [ ] Seed data is visible on first load (3 found, 2 lost, 3 for-home, 2 adopt, 3 stories)
- [ ] Home stats bar shows correct counts (3 / 2 / 3 / 2 / 3)
- [ ] All 7 nav links navigate to the correct section
- [ ] At least one listing card is visible in each section
- [ ] "+ Post" button opens the form in the same section
- [ ] Cancel button closes the form without saving
- [ ] Submitting a valid form saves the record and shows a toast
- [ ] Delete button removes a card after confirming the dialog
- [ ] Contact form submits and shows the success screen
- [ ] Page reload preserves all manually created data
- [ ] Mobile: hamburger button toggles the nav menu

---

## 3. CRUD Checklist

Repeat for each section: **Found Pets · Lost Pets · Pets for Home · I Want to Adopt · Pet Stories**

### Create
- [ ] Clicking "+ Post" button opens the form; button acts as a toggle (second click closes)
- [ ] Filling all required fields and submitting saves the record
- [ ] New record appears at the **top** of the grid (newest first)
- [ ] Home stats counter increments by 1
- [ ] Toast "Listing saved!" / "Story shared!" appears and disappears after ~3 s
- [ ] Form resets and closes after successful submit

### Read
- [ ] All saved records are displayed as cards
- [ ] Card shows: title, type badge, city, date (formatted), description
- [ ] Contact info (email link, phone link) appears only when provided
- [ ] Status badge reflects the saved status value
- [ ] Records persist after full page reload

### Update
- [ ] Clicking "Edit" on a card opens the form pre-filled with that record's data
- [ ] Form title changes to "Edit Listing" / "Edit Story"
- [ ] Changing a field and submitting updates the card in the grid
- [ ] Unchanged fields retain their original values
- [ ] Toast "Listing updated!" / "Story updated!" appears
- [ ] Editing does **not** change record position in the grid
- [ ] Home stats counter stays the same after edit

### Delete
- [ ] Clicking "Delete" shows a browser confirm dialog
- [ ] Confirming removes the card immediately
- [ ] Cancelling the dialog leaves the card intact
- [ ] Home stats counter decrements by 1
- [ ] Toast "Listing deleted." / "Story deleted." appears
- [ ] If the last record is deleted, empty-state message appears

---

## 4. Validation Checklist

Test each form independently.

### Required-field validation (all listing forms + contact)
- [ ] Submitting a completely empty form shows errors on **all** required fields
- [ ] Error text reads "This field is required."
- [ ] Focus jumps to the first invalid field
- [ ] Filling all required fields and resubmitting clears all errors and saves

### Per-field required fields
| Section | Required fields |
|---|---|
| Found Pets | Type, Name/Title, City, Date Found, Description |
| Lost Pets | Type, Pet Name, City, Date Lost, Description |
| Pets for Home | Type, Pet Name, City, Date Posted, Description |
| I Want to Adopt | Preferred Type, Request Title, City, Date, Description |
| Pet Stories | Story Title, Category, Your Story |
| Contact | Name, Email, Subject, Message |

### Email format validation
- [ ] Invalid email (e.g. `notanemail`, `a@b`) shows "Enter a valid email address."
- [ ] Valid email (e.g. `user@example.com`) is accepted
- [ ] Empty optional email field is accepted without error
- [ ] Contact form Email field is **required** — empty value shows required error

### Optional fields
- [ ] Contact Email (listing forms) — can be left blank; no error
- [ ] Contact Phone — can be left blank; no error
- [ ] Media URL (Stories) — can be left blank; no error; invalid URL is accepted (no URL validation in MVP)

### Error clearing
- [ ] Errors disappear when the form is re-submitted successfully
- [ ] Clicking Cancel clears errors
- [ ] Clicking "+ Post" to toggle open a fresh form shows no pre-existing errors

---

## 5. Search / Filter Checklist

Repeat for each section that has controls.

### Text search
- [ ] Typing in the search box filters cards in real time (on `input` event)
- [ ] Search matches against: title, city, description (case-insensitive)
- [ ] Clearing the search box restores all cards
- [ ] Search with no matches shows the empty-state message

### Type filter (Found · Lost · Pets for Home · Adopt)
- [ ] Selecting "Cat" shows only Cat records
- [ ] Selecting "Dog", "Bird", "Other" each work correctly
- [ ] Selecting "All Types" restores all records
- [ ] Type filter combines with text search (AND logic)

### City filter (Found · Lost · Pets for Home · Adopt)
- [ ] Dropdown is populated dynamically from cities in existing records
- [ ] Selecting a city shows only records from that city
- [ ] Adding a record with a new city adds it to the dropdown
- [ ] Deleting the last record from a city removes that city from the dropdown
- [ ] City filter combines with type filter and text search

### Status filter (Found · Lost · Adopt)
- [ ] Statuses available: Open / Resolved (Found, Lost); Open / Matched (Adopt)
- [ ] Selecting a status filters correctly

### Status filter (Pets for Home)
- [ ] Statuses available: Available / Adopted
- [ ] Selecting a status filters correctly

### Category filter (Pet Stories)
- [ ] Selecting Funny / Touching / Useful shows only stories in that category
- [ ] Selecting "All Categories" restores all stories
- [ ] Category filter combines with text search

### Combined filters
- [ ] All active filters apply simultaneously (AND logic)
- [ ] No records matching combined filters → empty-state message

---

## 6. Known Limitations

| # | Area | Limitation |
|---|---|---|
| L-1 | Data persistence | `localStorage` is browser- and origin-scoped. Data is lost if the user clears browser storage or switches browsers. |
| L-2 | Seed data | Seed fires once per origin (flag `pf_seeded`). Clearing `localStorage` re-runs the seed on next load. |
| L-3 | Media URL (Stories) | Any string is accepted as a URL. Broken images are silently removed via `onerror`. No preview during input. |
| L-4 | Phone validation | Phone field accepts any string — no format validation. |
| L-5 | Date fields | No min/max constraints. Future dates and dates far in the past are accepted. |
| L-6 | Duplicate records | No deduplication — identical listings can be posted multiple times. |
| L-7 | Story date | Story date is always set to today (server-side clock) on create/edit — the date field is not user-editable in stories. |
| L-8 | Concurrent tabs | Opening the app in two tabs simultaneously can cause one tab's writes to be overwritten by the other's stale reads. |
| L-9 | XSS | User input is HTML-escaped via the `esc()` helper before rendering. However, `href="mailto:..."` and `href="tel:..."` are built from user input — a `javascript:` URL in the email field would render as a link (though not execute without a click). |
| L-10 | No pagination | All records render at once. Performance degrades with very large datasets. |

---

## 7. Future Test Ideas

### Automation candidates
- Playwright smoke suite: navigate all sections, verify cards render, add/edit/delete one record per section
- `localStorage` state tests: pre-seed data via `page.evaluate`, verify counts and card content

### Edge cases to explore
- Very long input strings (500+ characters in title / description) — does layout break?
- Special characters in fields: `<`, `>`, `"`, `'`, `&`, emoji — verify XSS escaping holds
- Whitespace-only input in required fields — trimming (`obj[k] = v.trim()`) should block it
- Rapid clicks on "+ Post" toggle — form should not duplicate
- Editing a record while a search/filter is active — record should remain in its filtered position

### Exploratory scenarios
- Add 20+ records; verify all appear and the city dropdown stays readable
- Change status from Open → Resolved, then filter by Resolved — verify the card appears
- Delete all records in a section; verify stats show 0 and empty-state appears
- Reload the page mid-form — unsaved data is expected to be lost (no draft saving)
- Resize window to mobile width; verify hamburger appears and nav works

### Regression risk areas
- `updateStats()` is called from all write paths — verify it's not missed after any edit/delete
- `refreshCityFilter()` depends on current full dataset — verify it runs before filter comparisons
- `genId()` uses `Date.now() + random` — extremely fast sequential creates (tests) could collide; worth verifying uniqueness under load
