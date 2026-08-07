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
    const API_ENABLED_SECTIONS = new Set(['found', 'lost', 'forHome', 'adopt']);

    // Falls back to localhost if scripts/config.js wasn't loaded for some
    // reason — keeps local usage working even without the config file.
    const API_ORIGIN   = window.PET_FRIENDS_CONFIG?.API_BASE_URL || 'http://localhost:3000';
    const API_BASE_URL = API_ORIGIN + '/api/listings';

    // Must stay in sync with AUTH_TOKEN_KEY in app.js.
    const AUTH_TOKEN_KEY = 'pf_auth_token';

    // Attaches the signed-in user's token when one exists, so the backend can
    // resolve req.user and return accurate isOwner/createdByUserId. Guests
    // (no token) get an empty headers object and requests still work as before.
    function _authHeaders() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

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

    // Only local uploads ('/uploads/...') need the API origin prefixed so
    // <img src> works when the HTML is opened outside the backend's static
    // server. Cloudinary (or any other future provider) already returns an
    // absolute URL and must be used as-is.
    function _toDisplayPhotoUrl(rawPhotoUrl) {
        if (typeof rawPhotoUrl === 'string' && rawPhotoUrl.startsWith('/uploads/')) {
            return API_ORIGIN + rawPhotoUrl;
        }
        return rawPhotoUrl || null;
    }

    // Convert a backend API response record → frontend record shape.
    // photo.url is stored as full absolute URL so <img src> works when the
    // HTML is opened outside the backend's static server.
    // photoUrl (as returned by the backend, relative or absolute) is kept for
    // PUT payloads and for edit-without-change.
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
                          ? { source: 'asset', url: _toDisplayPhotoUrl(relPhotoUrl) }
                          : null,
            photoUrl: relPhotoUrl,  // raw backend value (relative or absolute) for API payloads
            photoPublicId: rec.photoPublicId ?? null,
            createdByUserId: rec.createdByUserId ?? null,
            isOwner:         rec.isOwner === true,
            ownerName:       rec.ownerName ?? null,
            createdAt: rec.createdAt
                           ? new Date(rec.createdAt).getTime()
                           : Date.now(),
            updatedAt: rec.updatedAt ? new Date(rec.updatedAt).getTime() : null,
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

    // filters: { q, petType, city, status, sort } — all optional. Empty/falsy
    // values are omitted from the query string; petType is lower-cased to
    // match the backend ENUM; sort is only sent when it differs from the
    // backend's default ('newest').
    //
    // pagination: { page, limit, withMeta } — all optional. When withMeta is
    // requested the backend responds with { items, pagination }; this always
    // resolves to that shape, normalizing a plain-array response (the
    // backend's backwards-compatible default, or a defensive fallback if
    // withMeta is ever ignored) into a single-page result instead of
    // crashing the caller.
    async function apiGetListings(sectionKey, filters = {}, pagination = {}) {
        const scenario = mapSectionKeyToScenario(sectionKey);
        if (!scenario) return { items: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 1 } };

        const params = new URLSearchParams();
        params.set('scenario', scenario);

        const { q, petType, city, status, sort } = filters;
        if (q)                          params.set('q', q);
        if (petType)                    params.set('petType', petType.toLowerCase());
        if (city)                       params.set('city', city);
        if (status)                     params.set('status', status);
        if (sort && sort !== 'newest')  params.set('sort', sort);

        const { page, limit, withMeta } = pagination;
        if (page)     params.set('page', page);
        if (limit)    params.set('limit', limit);
        if (withMeta) params.set('withMeta', 'true');

        const res = await fetch(`${API_BASE_URL}?${params.toString()}`, { headers: _authHeaders() });
        if (!res.ok) throw new Error(`GET listings failed (${res.status})`);
        const json = await res.json();

        if (Array.isArray(json)) {
            const items = json.map(fromApiRecord);
            return { items, pagination: { page: 1, limit: items.length, total: items.length, totalPages: 1 } };
        }

        const items = (json.items ?? []).map(fromApiRecord);
        return {
            items,
            pagination: json.pagination ?? { page: 1, limit: items.length, total: items.length, totalPages: 1 },
        };
    }

    async function apiGetListingById(sectionKey, id) {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, { headers: _authHeaders() });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`GET listing failed (${res.status})`);
        return fromApiRecord(await res.json());
    }

    // apiPayload is a pre-built backend-shaped object (built by app.js using
    // buildFoundApiPayload).  It is sent as-is — no toApiPayload conversion here.
    // Attaches the response status to the thrown Error so callers (app.js)
    // can tell 401/403/404 apart and show a specific, friendly message
    // instead of a generic failure toast.
    async function _throwForStatus(res, fallbackMessage) {
        const body = await res.json().catch(() => ({}));
        const err  = new Error(body.message || fallbackMessage);
        err.status = res.status;
        throw err;
    }

    async function apiCreateListing(_sectionKey, apiPayload) {
        const res = await fetch(API_BASE_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', ..._authHeaders() },
            body:    JSON.stringify(apiPayload),
        });
        if (!res.ok) await _throwForStatus(res, `POST listing failed (${res.status})`);
        return fromApiRecord(await res.json());
    }

    async function apiUpdateListing(_sectionKey, id, apiPayload) {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json', ..._authHeaders() },
            body:    JSON.stringify(apiPayload),
        });
        if (!res.ok) await _throwForStatus(res, `PUT listing failed (${res.status})`);
        return fromApiRecord(await res.json());
    }

    async function apiDeleteListing(_sectionKey, id) {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
            method:  'DELETE',
            headers: _authHeaders(),
        });
        if (!res.ok) await _throwForStatus(res, `DELETE listing failed (${res.status})`);
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
