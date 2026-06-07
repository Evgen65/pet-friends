# AGENTS.md — Pet Friends

## What This Project Is

Pet Friends is a plain HTML/CSS/JavaScript single-page app for animal lovers. It is intentionally simple and serves as a **realistic practice website for QA students**. There is no build step, no framework, no backend, and no npm packages.

## The Four Core User Scenarios (Never Break These)

1. **I Found a Pet** — post a found-animal listing with contact info
2. **I Lost My Pet** — post a lost-pet listing to find their companion
3. **I Am Looking for a Home for a Pet** — list a pet available for adoption
4. **I Want to Adopt a Pet** — post an adoption request or browse adoption listings

Plus:

5. **Pet Stories** — share funny, touching, or useful stories about pets

Every change must leave all five scenarios working end-to-end.

## Tech Constraints

**Current stack — do not change without explicit user permission:**
- Plain HTML5 (semantic elements, `novalidate` + JS validation)
- Plain CSS3 with CSS custom properties (variables in `:root`)
- Plain JavaScript ES6+ (no libraries, no modules bundler)
- `localStorage` for all data persistence
- No npm, no Node.js, no build tools, no backend

**Do not introduce without asking:**
- React, Vue, Angular, Svelte, or any other frontend framework
- jQuery, Lodash, Axios, or any JS library
- Bootstrap, Tailwind, or any CSS framework
- Webpack, Vite, Rollup, or any bundler
- Any `<script src="...">` that loads from a CDN unless the user requests it
- Any fetch/XHR calls to a backend

## Development Principles

### Keep It Beginner-Friendly
- Use clear, descriptive variable and function names.
- Prefer readable code over clever one-liners.
- Avoid deep nesting (max 3 levels is a good guideline).
- Use semantic HTML (`<section>`, `<nav>`, `<header>`, `<footer>`, `<form>`, `<label>`).
- Keep IDs and class names consistent and predictable (QA students rely on stable selectors).

### Make Small Incremental Changes
- One feature or bug fix per change set.
- Test the golden path and at least one edge case before declaring done.
- Keep diffs small and easy to review.

### Avoid Overengineering
- Do not add abstractions or utilities unless they are immediately used in two or more places.
- Do not add feature flags, configuration objects, or plugin systems.
- Do not add backwards-compatibility shims for removed code.
- Three similar lines are better than a premature abstraction.

### Stay QA-Friendly
- Every form field must have a `<label>` with a matching `for`/`id` pair.
- Required fields must be visually marked (the `*` + `.req` pattern used throughout).
- Validation errors must be visible, associated with the failing field, and cleared on correction.
- Status values on listing cards must always be displayed as a visible badge.
- Destructive actions (delete) must show a confirmation dialog.
- Toast notifications must appear and disappear predictably.
- Navigation must update the active link state on every section change.
- Empty states must be shown when a filtered list returns zero results.

## File Map

```
pet-friends/
├── index.html   All markup: header, nav, 7 sections, forms, footer
├── styles.css   All styles: CSS variables, layout, cards, forms, responsive
├── app.js       All logic: localStorage CRUD, rendering, validation, nav, seed data
└── AGENTS.md    This file
```

## Data Model

All data lives in `localStorage` under these keys:

| Key          | Section              | Fields                                                              |
|--------------|----------------------|---------------------------------------------------------------------|
| `pf_found`   | Found Pets           | id, type, title, city, date, description, email, phone, status, createdAt |
| `pf_lost`    | Lost Pets            | same as above                                                       |
| `pf_forHome` | Pets for Home        | same as above (status: Available / Adopted)                        |
| `pf_adopt`   | I Want to Adopt      | same as above (status: Open / Matched)                             |
| `pf_stories` | Pet Stories          | id, title, category, text, mediaUrl, date, createdAt               |
| `pf_seeded`  | seed flag            | '1' once sample data has been written                              |

`type` values: `Cat`, `Dog`, `Bird`, `Other`
`category` values (stories): `Funny`, `Touching`, `Useful`

## What Makes This Valuable for QA Practice

Students can test:

- Form validation (required fields, email format, error display, clearing on correction)
- CRUD on 5 separate data sets (create, read, update, delete)
- Search (text match across title, city, description)
- Filters (pet type, city dropdown populated dynamically, status)
- localStorage persistence across page reloads
- Navigation (7 sections, active state, mobile hamburger)
- Toast notification timing
- Confirmation dialogs before destructive actions
- Empty state rendering when all items are filtered out
- Responsive layout at 480 px, 768 px, and desktop widths
- Form toggle (same button opens and closes the form)
- Edit mode vs. add mode (form title changes, fields pre-fill)
- Contact form success state and reset

## Localisation Rules

- **English is the default UI language.** On first load (no `localStorage.petFriendsLanguage`), the app renders in English (`lang="en"`, `dir="ltr"`, `class="lang-en"`).
- **Russian and Hebrew are additional localizations.** They are applied dynamically via `applyTranslations(lang)` and persisted in `localStorage.petFriendsLanguage`.
- **Hebrew must use RTL direction.** Switching to `he` sets `dir="rtl"` on `<html>` and applies `[dir="rtl"]` CSS overrides (e.g. form accent border flips to the right).
- **Internal data values must remain stable in English.** `type` (`Cat`, `Dog`, `Bird`, `Other`), `status` (`Open`, `Resolved`, `Available`, `Adopted`, `Matched`), and `category` (`Funny`, `Touching`, `Useful`) are stored and compared as English strings. Do not translate them.
- **Only visible UI labels should be translated.** Use `data-i18n` attributes on display elements. Never use translated strings in JavaScript logic, localStorage keys, filter comparisons, or CSS class names.

## Suggested Future Enhancements (Ask the User First)

- Image upload (requires a backend or a third-party service such as Cloudinary)
- Real email delivery for the contact form
- Pagination or infinite scroll for large data sets
- User accounts and authentication
- Map integration for city/location
- Accessibility audit (WCAG 2.1 AA)
- Keyboard navigation improvements
- Unit tests with plain JS (no test framework unless requested)
