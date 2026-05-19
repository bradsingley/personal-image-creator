/**
 * Styles store: load seed presets from data/styles.json, overlay
 * user edits stored in localStorage. Exports a JSON download for
 * committing changes back to the repo.
 */

const StylesStore = (() => {
    const OVERRIDES_KEY = 'pic.styleOverrides';
    const DELETED_KEY = 'pic.styleDeleted';
    const SEED_URL = 'data/styles.json';

    let seed = null;
    let overrides = {};
    let deleted = new Set();
    let loaded = false;

    function loadOverrides() {
        try {
            overrides = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
        } catch {
            overrides = {};
        }
        try {
            deleted = new Set(JSON.parse(localStorage.getItem(DELETED_KEY) || '[]'));
        } catch {
            deleted = new Set();
        }
    }

    function saveOverrides() {
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
        localStorage.setItem(DELETED_KEY, JSON.stringify([...deleted]));
    }

    function notify() {
        document.dispatchEvent(new CustomEvent('pic:styles-changed'));
    }

    async function ensureLoaded() {
        if (loaded) return;
        try {
            const res = await fetch(SEED_URL, { cache: 'no-store' });
            const json = await res.json();
            seed = Array.isArray(json) ? json : json.styles || [];
        } catch {
            seed = [];
        }
        loadOverrides();
        loaded = true;
    }

    function getAll() {
        if (!loaded) return [];
        const seedMap = new Map(seed.map((s) => [s.id, s]));
        // Apply overrides on top of seed, drop deleted, append new entries
        const result = [];
        for (const s of seed) {
            if (deleted.has(s.id)) continue;
            result.push({ ...s, ...(overrides[s.id] || {}) });
        }
        for (const [id, ov] of Object.entries(overrides)) {
            if (!seedMap.has(id) && !deleted.has(id)) {
                result.push({ id, ...ov });
            }
        }
        return result;
    }

    function get(id) {
        return getAll().find((s) => s.id === id) || null;
    }

    function upsert(style) {
        if (!style.id) {
            style.id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        }
        overrides[style.id] = {
            name: style.name,
            promptSuffix: style.promptSuffix,
            description: style.description || '',
        };
        deleted.delete(style.id);
        saveOverrides();
        notify();
        return style.id;
    }

    function remove(id) {
        const seedMap = new Map((seed || []).map((s) => [s.id, s]));
        if (seedMap.has(id)) {
            deleted.add(id);
        }
        delete overrides[id];
        saveOverrides();
        notify();
    }

    function isSeed(id) {
        return (seed || []).some((s) => s.id === id);
    }

    function isOverridden(id) {
        return !!overrides[id];
    }

    function resetAll() {
        overrides = {};
        deleted = new Set();
        saveOverrides();
        notify();
    }

    function exportJson() {
        const merged = getAll();
        return JSON.stringify({ styles: merged }, null, 2);
    }

    return { ensureLoaded, getAll, get, upsert, remove, resetAll, exportJson, isSeed, isOverridden };
})();
