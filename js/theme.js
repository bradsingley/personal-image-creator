(function () {
    const KEY = 'pim.theme';

    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    function current() {
        return localStorage.getItem(KEY) || 'light';
    }

    // Apply ASAP to avoid flash
    apply(current());

    document.addEventListener('DOMContentLoaded', () => {
        const toggle = document.getElementById('themeToggle');
        if (!toggle) return;
        toggle.checked = current() === 'dark';
        toggle.addEventListener('change', () => {
            const next = toggle.checked ? 'dark' : 'light';
            localStorage.setItem(KEY, next);
            apply(next);
        });
    });
})();
