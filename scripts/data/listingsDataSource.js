'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pet Friends — Listings Data Layer
//
// API_ENABLED_SECTIONS controls which sections route through the backend API.
// All other sections continue to use localStorage.
//
// To add a section to API mode, add its key here AND ensure app.js awaits
// the async data-layer functions for that section.
// ─────────────────────────────────────────────────────────────────────────────

window.PetFriendsListingsDataSource = (function () {

    // ── Configuration ────────────────────────────────────────────────────────

    // Only sections listed here use the backend API.  All others use localStorage.
    const API_ENABLED_SECTIONS = new Set(['found', 'lost']);

    const API_ORIGIN   = 'http://localhost:3000';
    const API_BASE_URL = API_ORIGIN + '/api/listings';

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
    // Maps frontend section keys → backend 'scenario' values.
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

    // ── Record conversion ────────────────────────────────────────────────────

    // petType: frontend Title-case ('Cat') ↔ backend lower-case ENUM ('cat').
    function _toBackendPetType(type) {
        return type ? type.toLowerCase() : null;
    }

    function _toFrontendPetType(backendType) {
        const map = { cat: 'Cat', dog: 'Dog', bird: 'Bird', rabbit: 'Other', other: 'Other' };
        return backendType ? (map[backendType.toLowerCase()] ?? 'Other') : '';
    }

    // photo: only asset-URL photos can be sent; Base64 uploads are handled
    // separately via apiUploadPhoto() before building the payload.
    function _toBackendPhotoUrl(photo) {
        if (photo && photo.source === 'asset' && typeof photo.url === 'string') {
            // Strip origin prefix so only the relative path is stored in MySQL.
            return photo.url.startsWith(API_ORIGIN)
                ? photo.url.slice(API_ORIGIN.length)
                : photo.url;
        }
        return null;
    }

    // Convert a frontend localStorage record → backend POST/PUT payload.
    // Caller is responsible for building photoUrl from any pending upload.
    function toApiPayload(sectionKey, record) {
        return {
            scenario:        mapSectionKeyToScenario(sectionKey),
            petType:         _toBackendPetType(record.type),
            petNameOrTitle:  record.title   ?? '',
            breed:           record.breed   ?? null,
            city:            record.city    ?? '',
            eventDate:       record.date    ?? null,
            description:     record.description ?? '',
            contactEmail:    record.email   ?? null,
            contactPhone:    record.phone   ?? null,
            status:          record.status  ?? 'Open',
            contentLanguage: record.contentLanguage ?? 'en',
            photoUrl:        _toBackendPhotoUrl(record.photo),
        };
    }

    // Convert a backend API response record → frontend record shape.
    // photo.url is stored as full absolute URL so <img src> works when the
    // HTML is opened outside the backend's static server.
    // photoUrl (relative) is kept for PUT payloads and for edit-without-change.
    function fromApiRecord(rec) {
        const relPhotoUrl = rec.photoUrl || null;
        return {
            id:              String(rec.id),
            type:            _toFrontendPetType(rec.petType),
            title:           rec.petNameOrTitle ?? '',
            breed:           rec.breed          ?? null,
            city:            rec.city           ?? '',
            date:            rec.eventDate      ?? null,
            description:     rec.description    ?? '',
            email:           rec.contactEmail   ?? null,
            phone:           rec.contactPhone   ?? null,
            status:          rec.status         ?? 'Open',
            contentLanguage: rec.contentLanguage ?? 'en',
            photo:    relPhotoUrl
                          ? { source: 'asset', url: API_ORIGIN + relPhotoUrl }
                          : null,
            photoUrl: relPhotoUrl,  // relative path for API payloads
            createdAt: rec.createdAt
                           ? new Date(rec.createdAt).getTime()
                           : Date.now(),
        };
    }

    // ── Photo upload helper ──────────────────────────────────────────────────

    function _dataUrlToBlob(dataUrl, mimeType) {
        const byteStr = atob(dataUrl.split(',')[1]);
        const buf     = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) buf[i] = byteStr.charCodeAt(i);
        return new Blob([buf], { type: mimeType });
    }

    // Upload a pending Base64 photo to the backend upload endpoint.
    // Returns the relative photoUrl: '/uploads/listings/listing-xxx.jpg'
    async function apiUploadPhoto(dataUrl, fileName, mimeType) {
        const blob = _dataUrlToBlob(dataUrl, mimeType);
        const fd   = new FormData();
        fd.append('photo', blob, fileName);
        const res = await fetch(`${API_ORIGIN}/api/uploads/photos`, {
            method: 'POST',
            body:   fd,
        });
        if (!res.ok) throw new Error(`Photo upload failed (${res.status})`);
        const json = await res.json();
        return json.photoUrl;  // e.g. '/uploads/listings/listing-xxx.jpg'
    }

    // ── API adapter helpers ──────────────────────────────────────────────────
    // These are active for sections listed in API_ENABLED_SECTIONS.

    async function apiGetListings(sectionKey) {
        const scenario = mapSectionKeyToScenario(sectionKey);
        if (!scenario) return [];
        const res = await fetch(`${API_BASE_URL}?scenario=${encodeURIComponent(scenario)}`);
        if (!res.ok) throw new Error(`GET listings failed (${res.status})`);
        return (await res.json()).map(fromApiRecord);
    }

    async function apiGetListingById(sectionKey, id) {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`GET listing failed (${res.status})`);
        return fromApiRecord(await res.json());
    }

    // apiPayload is a pre-built backend-shaped object (built by app.js using
    // buildFoundApiPayload).  It is sent as-is — no toApiPayload conversion here.
    async function apiCreateListing(_sectionKey, apiPayload) {
        const res = await fetch(API_BASE_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(apiPayload),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message || `POST listing failed (${res.status})`);
        }
        return fromApiRecord(await res.json());
    }

    async function apiUpdateListing(_sectionKey, id, apiPayload) {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(apiPayload),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message || `PUT listing failed (${res.status})`);
        }
        return fromApiRecord(await res.json());
    }

    async function apiDeleteListing(_sectionKey, id) {
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

    // ── Public functions — localStorage only (used by app.js load/save) ──────
    // Sections in API_ENABLED_SECTIONS bypass these in app.js and call api*
    // functions directly.

    function load(sectionKey)            { return lsLoad(sectionKey); }
    function save(sectionKey, data)      { return lsSave(sectionKey, data); }
    function getListings(sectionKey)     { return lsLoad(sectionKey); }
    function saveListings(sectionKey, d) { return lsSave(sectionKey, d); }

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
        API_ENABLED_SECTIONS,
        // localStorage public interface (used by app.js load/save wrappers)
        load,
        save,
        getListings,
        saveListings,
        getListingById,
        createListing,
        updateListing,
        deleteListing,
        // API adapter (called directly by app.js for API-enabled sections)
        apiGetListings,
        apiGetListingById,
        apiCreateListing,
        apiUpdateListing,
        apiDeleteListing,
        apiUploadPhoto,
        // Conversion helpers (exposed for testing)
        mapSectionKeyToScenario,
        toApiPayload,
        fromApiRecord,
    };

})();
