'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pet Friends — Auth Data Layer
//
// Thin fetch wrapper around the backend Auth API. Holds no state of its own —
// token/user persistence lives in app.js (localStorage), this file only talks
// to the network.
// ─────────────────────────────────────────────────────────────────────────────

window.PetFriendsAuthDataSource = (function () {

    // Falls back to localhost if scripts/config.js wasn't loaded for some
    // reason — keeps local usage working even without the config file.
    const API_ORIGIN   = window.PET_FRIENDS_CONFIG?.API_BASE_URL || 'http://localhost:3000';
    const API_BASE_URL = API_ORIGIN + '/api/auth';

    // Parses a JSON response body safely, then throws a friendly Error for
    // non-OK responses — callers only need to catch and show err.message.
    async function _parseResponse(res) {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            const err = new Error(body.message || `Request failed (${res.status})`);
            err.status  = res.status;
            err.details = body.details;
            throw err;
        }
        return body;
    }

    async function signup(name, email, password) {
        const res = await fetch(`${API_BASE_URL}/signup`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name, email, password }),
        });
        return _parseResponse(res); // { status, user, token }
    }

    async function signin(email, password) {
        const res = await fetch(`${API_BASE_URL}/signin`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, password }),
        });
        return _parseResponse(res); // { status, user, token }
    }

    async function me(token) {
        const res = await fetch(`${API_BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return _parseResponse(res); // { status, user }
    }

    async function signout(token) {
        const res = await fetch(`${API_BASE_URL}/signout`, {
            method:  'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        return _parseResponse(res); // { status, message }
    }

    return { signup, signin, me, signout };

})();
