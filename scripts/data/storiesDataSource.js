'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pet Friends — Pet Stories Data Layer
//
// Stories are always served through the backend Pet Stories API — there is no
// localStorage fallback for story content (unlike listingsDataSource.js, which
// still supports both modes). The backend pet_stories table has no "category"
// column, so app.js keeps a small localStorage-only side-map for that field —
// this file only ever talks to /api/stories.
// ─────────────────────────────────────────────────────────────────────────────

window.PetFriendsStoriesDataSource = (function () {

    // Falls back to localhost if scripts/config.js wasn't loaded for some
    // reason — keeps local usage working even without the config file.
    const API_ORIGIN   = window.PET_FRIENDS_CONFIG?.API_BASE_URL || 'http://localhost:3000';
    const API_BASE_URL = API_ORIGIN + '/api/stories';

    // ── Record conversion ────────────────────────────────────────────────────

    function _toDateOnly(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return isNaN(d) ? '' : d.toISOString().slice(0, 10);
    }

    // Only relative '/uploads/...' image URLs need the API origin prefixed so
    // <img src> works when index.html is opened outside the backend's server.
    function _toDisplayMediaUrl(mediaType, mediaUrl) {
        if (mediaType === 'image' && typeof mediaUrl === 'string' && mediaUrl.startsWith('/uploads/')) {
            return API_ORIGIN + mediaUrl;
        }
        return mediaUrl || '';
    }

    // Convert a backend API story record → frontend record shape used by app.js.
    // mediaUrlRelative is kept for PUT payloads and edit-without-photo-change.
    function fromApiRecord(rec) {
        return {
            id:               String(rec.id),
            title:            rec.title ?? '',
            text:             rec.storyText ?? '',
            mediaType:        rec.mediaType ?? 'none',
            mediaUrl:         _toDisplayMediaUrl(rec.mediaType, rec.mediaUrl),
            mediaUrlRelative: rec.mediaUrl ?? null,
            petName:          rec.petName ?? null,
            petType:          rec.petType ?? null,
            city:             rec.city    ?? null,
            contentLanguage:  rec.contentLanguage ?? 'en',
            status:           rec.status ?? 'published',
            date:             _toDateOnly(rec.createdAt),
            createdAt:        rec.createdAt ? new Date(rec.createdAt).getTime() : Date.now(),
        };
    }

    // ── Photo upload helper ──────────────────────────────────────────────────
    // Mirrors PetFriendsListingsDataSource.apiUploadPhoto — reuses the same
    // resize-to-dataURL pipeline already wired up in app.js for listing photos,
    // so story images get the same client-side size/dimension handling.

    function _dataUrlToBlob(dataUrl, mimeType) {
        const byteStr = atob(dataUrl.split(',')[1]);
        const buf     = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) buf[i] = byteStr.charCodeAt(i);
        return new Blob([buf], { type: mimeType });
    }

    // Returns the relative photoUrl: '/uploads/listings/listing-xxx.jpg'
    async function uploadStoryPhoto(dataUrl, fileName, mimeType) {
        const blob = _dataUrlToBlob(dataUrl, mimeType);
        const fd   = new FormData();
        fd.append('photo', blob, fileName);
        const res = await fetch(`${API_ORIGIN}/api/uploads/photos`, {
            method: 'POST',
            body:   fd,
        });
        if (!res.ok) throw new Error(`Photo upload failed (${res.status})`);
        const json = await res.json();
        return json.photoUrl;
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    async function getStories() {
        const res = await fetch(API_BASE_URL);
        if (!res.ok) throw new Error(`GET stories failed (${res.status})`);
        return (await res.json()).map(fromApiRecord);
    }

    async function getStoryById(id) {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`GET story failed (${res.status})`);
        return fromApiRecord(await res.json());
    }

    // apiPayload is a pre-built backend-shaped object (built by app.js). It is
    // sent as-is — no extra conversion here, matching the listings adapter.
    async function createStory(apiPayload) {
        const res = await fetch(API_BASE_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(apiPayload),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message || `POST story failed (${res.status})`);
        }
        return fromApiRecord(await res.json());
    }

    async function updateStory(id, apiPayload) {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(apiPayload),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message || `PUT story failed (${res.status})`);
        }
        return fromApiRecord(await res.json());
    }

    async function deleteStory(id) {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
        if (res.status === 404) return false;
        if (!res.ok) throw new Error(`DELETE story failed (${res.status})`);
        return true;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    return {
        getStories,
        getStoryById,
        createStory,
        updateStory,
        deleteStory,
        uploadStoryPhoto,
        fromApiRecord,
    };

})();
