/**
 * Auth helpers — wraps better-auth endpoints on lab-api.
 * Same session cookie as mudbord / itsallconnected / treefolio (domain .bradsingley.com).
 */

let _userPromise = null;

async function signUp(email, password, name) {
    _userPromise = null;
    return api('/auth/sign-up/email', {
        method: 'POST',
        body: { email, password, name: name || (email || '').split('@')[0] },
    });
}

async function signIn(email, password) {
    _userPromise = null;
    return api('/auth/sign-in/email', {
        method: 'POST',
        body: { email, password },
    });
}

async function signOut() {
    _userPromise = null;
    return api('/auth/sign-out', { method: 'POST', body: {} });
}

async function getCurrentUser() {
    if (!_userPromise) {
        _userPromise = api('/me').then(({ data, error }) => {
            if (error || !data) return null;
            return data.user || null;
        });
    }
    return _userPromise;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

/**
 * Gate a page on authentication. If unauthenticated, redirect to login.
 * If authenticated, populate the user badge in the header.
 * @returns {Promise<object|null>} the user object, or null if redirecting.
 */
async function requirePageAuth() {
    const user = await getCurrentUser();
    if (!user) {
        const next = encodeURIComponent(location.pathname + location.search);
        location.replace(`login.html?next=${next}`);
        return null;
    }
    renderUserBadge(user);
    return user;
}

function renderUserBadge(user) {
    const badge = document.getElementById('userBadge');
    if (!badge) return;
    const name = user.name || (user.email || '').split('@')[0] || 'Anonymous';
    badge.innerHTML = `
        <span class="user-badge__name">${escapeHtml(name)}</span>
        <button type="button" class="user-badge__signout" id="signOutBtn">Sign out</button>
    `;
    badge.hidden = false;
    document.getElementById('signOutBtn').addEventListener('click', async () => {
        await signOut();
        location.replace('login.html');
    });
}
