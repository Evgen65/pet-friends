'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pet Friends — Admin Cleanup Data Layer
//
// Thin fetch wrapper around the admin-only backend endpoints. Holds no state
// of its own — the admin cleanup UI state lives in app.js, this file only
// talks to the network.
// ─────────────────────────────────────────────────────────────────────────────

window.PetFriendsAdminDataSource = (function () {

    // Falls back to localhost if scripts/config.js wasn't loaded for some
    // reason — keeps local usage working even without the config file.
    const API_ORIGIN   = window.PET_FRIENDS_CONFIG?.API_BASE_URL || 'http://localhost:3000';
    const API_BASE_URL = API_ORIGIN + '/api/admin/listings';

    // Must stay in sync with AUTH_TOKEN_KEY in app.js.
    const AUTH_TOKEN_KEY = 'pf_auth_token';

    function _authHeaders() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    // Attaches the response status to the thrown Error so callers (app.js)
    // can tell 401/403 apart and show a specific, friendly message.
    async function _throwForStatus(res, fallbackMessage) {
        const body = await res.json().catch(() => ({}));
        const err  = new Error(body.message || fallbackMessage);
        err.status = res.status;
        throw err;
    }

    // filters: { q, scenario, petType, city, status, testOnly } — all optional.
    // pagination: { page, limit } — all optional.
    async function getAdminListings(filters = {}, pagination = {}) {
        const params = new URLSearchParams();

        const { q, scenario, petType, city, status, testOnly } = filters;
        if (q)        params.set('q', q);
        if (scenario) params.set('scenario', scenario);
        if (petType)  params.set('petType', petType);
        if (city)     params.set('city', city);
        if (status)   params.set('status', status);
        if (testOnly) params.set('testOnly', 'true');

        const { page, limit } = pagination;
        if (page)  params.set('page', page);
        if (limit) params.set('limit', limit);

        const res = await fetch(`${API_BASE_URL}?${params.toString()}`, { headers: _authHeaders() });
        if (!res.ok) await _throwForStatus(res, `GET admin listings failed (${res.status})`);
        return res.json(); // { items, pagination }
    }

    async function bulkDeleteListings(ids) {
        const res = await fetch(`${API_BASE_URL}/bulk`, {
            method:  'DELETE',
            headers: { 'Content-Type': 'application/json', ..._authHeaders() },
            body:    JSON.stringify({ ids }),
        });
        if (!res.ok) await _throwForStatus(res, `DELETE admin listings failed (${res.status})`);
        return res.json(); // { status, deletedCount }
    }

    return { getAdminListings, bulkDeleteListings };

})();
