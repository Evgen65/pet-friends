'use strict';

// Frontend data layer for Pet Friends.
// All listing persistence is routed through this object.
// Switch DATA_SOURCE to 'api' in a future milestone to redirect traffic to the backend.
window.PetFriendsListingsDataSource = (function () {

    const DATA_SOURCE = 'localStorage';

    // Must stay in sync with KEYS in app.js (listing sections only).
    const STORAGE_KEYS = {
        found:   'pf_found',
        lost:    'pf_lost',
        forHome: 'pf_forHome',
        adopt:   'pf_adopt',
        stories: 'pf_stories',
    };

    function _key(sectionKey) {
        return STORAGE_KEYS[sectionKey] || null;
    }

    // ── Core read / write ────────────────────────────────────────────────────

    function load(sectionKey) {
        try {
            const k = _key(sectionKey);
            if (!k) return [];
            return JSON.parse(localStorage.getItem(k) || '[]');
        } catch {
            return [];
        }
    }

    function save(sectionKey, data) {
        const k = _key(sectionKey);
        if (!k) return false;
        localStorage.setItem(k, JSON.stringify(data));
        return true;
    }

    // ── Named aliases (preferred by future callers) ──────────────────────────

    function getListings(sectionKey)              { return load(sectionKey); }
    function saveListings(sectionKey, listings)   { return save(sectionKey, listings); }

    // ── Higher-level helpers ─────────────────────────────────────────────────

    function getListingById(sectionKey, id) {
        return load(sectionKey).find(item => item.id === id) ?? null;
    }

    function createListing(sectionKey, listing) {
        const data = load(sectionKey);
        data.unshift(listing);
        save(sectionKey, data);
        return listing;
    }

    function updateListing(sectionKey, id, updates) {
        const data = load(sectionKey);
        const idx  = data.findIndex(item => item.id === id);
        if (idx === -1) return null;
        data[idx] = { ...data[idx], ...updates };
        save(sectionKey, data);
        return data[idx];
    }

    function deleteListing(sectionKey, id) {
        const data     = load(sectionKey);
        const filtered = data.filter(item => item.id !== id);
        if (filtered.length === data.length) return false;
        save(sectionKey, filtered);
        return true;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    return {
        DATA_SOURCE,
        load,
        save,
        getListings,
        saveListings,
        getListingById,
        createListing,
        updateListing,
        deleteListing,
    };

})();
