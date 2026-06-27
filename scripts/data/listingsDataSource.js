'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pet Friends — Listings Data Layer
//
// ACTIVE_DATA_SOURCE controls where data is read/written:
//   'localStorage' — current mode; all CRUD goes to the browser.
//   'api'          — future mode; all CRUD goes to the backend REST API.
//
// To switch to API mode, change ACTIVE_DATA_SOURCE to 'api' AND update the
// public functions to call the api* helpers (requires app.js to become async).
// That work is deferred to a future milestone.
// ─────────────────────────────────────────────────────────────────────────────

window.PetFriendsListingsDataSource = (function () {

    // ── Configuration ────────────────────────────────────────────────────────

    // Keep as 'localStorage' until the API integration milestone.
    const ACTIVE_DATA_SOURCE = 'localStorage';

    // Backend base URL — used only by api* helpers (currently inactive).
    const API_BASE_URL = 'http://localhost:3000/api/listings';

    // ── localStorage key map ─────────────────────────────────────────────────
    // Must stay in sync with KEYS in app.js (listing sections only).

    const STORAGE_KEYS = {
        found:   'pf_found',
        lost:    'pf_lost',
        forHome: 'pf_forHome',
        adopt:   'pf_adopt',
        stories: 'pf_stories',
    };

    function _storageKey(sectionKey) {
        return STORAGE_KEYS[sectionKey] || null;
    }

    // ── Backend scenario map ─────────────────────────────────────────────────
    // Maps frontend section keys to the 'scenario' values the backend expects.
    // stories is excluded — the backend listings API does not handle stories.

    function mapSectionKeyToScenario(sectionKey) {
        switch (sectionKey) {
            case 'found':   return 'found';
            case 'lost':    return 'lost';
            case 'forHome': return 'for_home';
            case 'adopt':   return 'adopt';
            default:        return null;
        }
    }

    // ── Field-name conversion helpers ────────────────────────────────────────
    // Frontend localStorage records use short camelCase field names.
    // Backend API records use a different (fuller) camelCase shape.
    // These helpers are NOT called while ACTIVE_DATA_SOURCE is 'localStorage'.

    // petType: frontend uses Title-case ('Cat'); backend uses lower-case ENUM ('cat').
    function _toBackendPetType(frontendType) {
        return frontendType ? frontendType.toLowerCase() : null;
    }

    // petType: backend lower-case → frontend Title-case.
    // 'rabbit' has no frontend equivalent yet; falls back to 'Other'.
    function _toFrontendPetType(backendType) {
        if (!backendType) return '';
        const map = { cat: 'Cat', dog: 'Dog', bird: 'Bird', rabbit: 'Other', other: 'Other' };
        return map[backendType.toLowerCase()] ?? 'Other';
    }

    // Photo: only 'asset' photos (already a URL) can be sent to the backend.
    // Base64 / local uploads are kept in localStorage only — no upload endpoint yet.
    function _toBackendPhotoUrl(photo) {
        if (photo && photo.source === 'asset' && typeof photo.url === 'string') {
            return photo.url;
        }
        return null;
    }

    // Convert a frontend localStorage record → backend POST/PUT payload.
    function toApiPayload(sectionKey, record) {
        return {
            scenario:       mapSectionKeyToScenario(sectionKey),
            petType:        _toBackendPetType(record.type),
            petNameOrTitle: record.title   ?? '',
            breed:          record.breed   ?? null,
            city:           record.city    ?? '',
            eventDate:      record.date    ?? null,
            description:    record.description ?? '',
            contactEmail:   record.email   ?? null,
            contactPhone:   record.phone   ?? null,
            status:         record.status  ?? 'Open',
            contentLanguage: record.contentLanguage ?? 'en',
            photoUrl:       _toBackendPhotoUrl(record.photo),
        };
    }

    // Convert a backend API response record → frontend record shape.
    // Backend integer IDs are coerced to strings to match frontend id comparisons.
    function fromApiRecord(apiRecord) {
        return {
            id:              String(apiRecord.id),
            type:            _toFrontendPetType(apiRecord.petType),
            title:           apiRecord.petNameOrTitle ?? '',
            breed:           apiRecord.breed          ?? null,
            city:            apiRecord.city           ?? '',
            date:            apiRecord.eventDate      ?? null,
            description:     apiRecord.description    ?? '',
            email:           apiRecord.contactEmail   ?? null,
            phone:           apiRecord.contactPhone   ?? null,
            status:          apiRecord.status         ?? 'Open',
            contentLanguage: apiRecord.contentLanguage ?? 'en',
            photo:           apiRecord.photoUrl
                                 ? { source: 'asset', url: apiRecord.photoUrl }
                                 : null,
            createdAt: apiRecord.createdAt
                           ? new Date(apiRecord.createdAt).getTime()
                           : Date.now(),
        };
    }

    // ── API adapter helpers (prepared; inactive while ACTIVE_DATA_SOURCE is
    //    'localStorage').  Marked async — app.js must be updated before these
    //    can be wired into the public functions. ──────────────────────────────

    async function apiGetListings(sectionKey) {
        const scenario = mapSectionKeyToScenario(sectionKey);
        if (!scenario) return [];
        const url = `${API_BASE_URL}?scenario=${encodeURIComponent(scenario)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`GET listings failed (${res.status})`);
        const records = await res.json();
        return records.map(fromApiRecord);
    }

    async function apiGetListingById(sectionKey, id) {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`GET listing failed (${res.status})`);
        return fromApiRecord(await res.json());
    }

    async function apiCreateListing(sectionKey, listing) {
        const res = await fetch(API_BASE_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(toApiPayload(sectionKey, listing)),
        });
        if (!res.ok) throw new Error(`POST listing failed (${res.status})`);
        return fromApiRecord(await res.json());
    }

    async function apiUpdateListing(sectionKey, id, listing) {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(toApiPayload(sectionKey, listing)),
        });
        if (!res.ok) throw new Error(`PUT listing failed (${res.status})`);
        return fromApiRecord(await res.json());
    }

    async function apiDeleteListing(sectionKey, id) {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
        if (res.status === 404) return false;
        if (!res.ok) throw new Error(`DELETE listing failed (${res.status})`);
        return true;
    }

    // ── localStorage implementation ──────────────────────────────────────────

    function lsLoad(sectionKey) {
        try {
            const k = _storageKey(sectionKey);
            if (!k) return [];
            return JSON.parse(localStorage.getItem(k) || '[]');
        } catch {
            return [];
        }
    }

    function lsSave(sectionKey, data) {
        const k = _storageKey(sectionKey);
        if (!k) return false;
        localStorage.setItem(k, JSON.stringify(data));
        return true;
    }

    // ── Public functions — always route to localStorage for now ──────────────
    // When ACTIVE_DATA_SOURCE becomes 'api', these functions will call the
    // api* helpers above.  That requires app.js to be updated to handle async
    // return values — deferred to a future milestone.

    function load(sectionKey) {
        return lsLoad(sectionKey);
    }

    function save(sectionKey, data) {
        return lsSave(sectionKey, data);
    }

    function getListings(sectionKey)            { return lsLoad(sectionKey); }
    function saveListings(sectionKey, listings) { return lsSave(sectionKey, listings); }

    function getListingById(sectionKey, id) {
        return lsLoad(sectionKey).find(item => item.id === id) ?? null;
    }

    function createListing(sectionKey, listing) {
        const data = lsLoad(sectionKey);
        data.unshift(listing);
        lsSave(sectionKey, data);
        return listing;
    }

    function updateListing(sectionKey, id, updates) {
        const data = lsLoad(sectionKey);
        const idx  = data.findIndex(item => item.id === id);
        if (idx === -1) return null;
        data[idx] = { ...data[idx], ...updates };
        lsSave(sectionKey, data);
        return data[idx];
    }

    function deleteListing(sectionKey, id) {
        const data     = lsLoad(sectionKey);
        const filtered = data.filter(item => item.id !== id);
        if (filtered.length === data.length) return false;
        lsSave(sectionKey, filtered);
        return true;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    return {
        ACTIVE_DATA_SOURCE,
        // Core (used by app.js load/save wrappers)
        load,
        save,
        // Named aliases
        getListings,
        saveListings,
        // Higher-level CRUD
        getListingById,
        createListing,
        updateListing,
        deleteListing,
        // Conversion helpers (exposed for testing and future milestone use)
        mapSectionKeyToScenario,
        toApiPayload,
        fromApiRecord,
    };

})();
