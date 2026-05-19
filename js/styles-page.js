document.addEventListener('DOMContentLoaded', async () => {
    await StylesStore.ensureLoaded();

    const grid = document.getElementById('styleGrid');
    const modal = document.getElementById('styleModal');
    const overlay = document.getElementById('modalOverlay');
    const form = document.getElementById('styleForm');
    const nameInput = document.getElementById('styleName');
    const suffixInput = document.getElementById('stylePromptSuffix');
    const descInput = document.getElementById('styleDescription');
    const modalTitle = document.getElementById('modalTitle');
    const cancelBtn = document.getElementById('cancelStyleBtn');
    const newBtn = document.getElementById('newStyleBtn');
    const exportBtn = document.getElementById('exportBtn');
    const resetBtn = document.getElementById('resetBtn');

    let editingId = null;

    function openModal(style) {
        editingId = style?.id || null;
        modalTitle.textContent = editingId ? 'Edit style' : 'New style';
        nameInput.value = style?.name || '';
        suffixInput.value = style?.promptSuffix || '';
        descInput.value = style?.description || '';
        modal.hidden = false;
        nameInput.focus();
    }

    function closeModal() {
        modal.hidden = true;
        editingId = null;
        form.reset();
    }

    function render() {
        const styles = StylesStore.getAll();
        grid.innerHTML = '';
        if (styles.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'empty';
            empty.textContent = 'No styles yet. Add your first preset.';
            grid.appendChild(empty);
            return;
        }
        for (const s of styles) {
            const li = document.createElement('li');
            li.className = 'style-card';

            const swatch = document.createElement('div');
            swatch.className = 'style-card__swatch';
            // Deterministic hue per id
            const hue = [...s.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
            swatch.style.background = `linear-gradient(135deg, hsl(${hue}, 35%, 78%), hsl(${(hue + 60) % 360}, 35%, 55%))`;
            li.appendChild(swatch);

            const h = document.createElement('h2');
            h.className = 'style-card__name';
            h.textContent = s.name;
            li.appendChild(h);

            const desc = document.createElement('p');
            desc.className = 'style-card__desc';
            desc.textContent = s.description || '';
            li.appendChild(desc);

            const suffix = document.createElement('p');
            suffix.className = 'style-card__suffix';
            suffix.textContent = s.promptSuffix;
            li.appendChild(suffix);

            const isSeed = StylesStore.isSeed(s.id);
            const isOverridden = StylesStore.isOverridden(s.id);
            if (isSeed || isOverridden) {
                const badge = document.createElement('span');
                badge.className = 'style-card__badge';
                badge.textContent = isSeed && !isOverridden ? 'seed' : isSeed ? 'edited' : 'custom';
                li.appendChild(badge);
            }

            const actions = document.createElement('div');
            actions.className = 'style-card__actions';

            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'btn btn--ghost';
            edit.textContent = 'Edit';
            edit.addEventListener('click', () => openModal(s));

            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'btn btn--ghost';
            del.textContent = 'Delete';
            del.addEventListener('click', () => {
                if (confirm(`Delete style "${s.name}"?`)) StylesStore.remove(s.id);
            });

            actions.appendChild(edit);
            actions.appendChild(del);
            li.appendChild(actions);

            grid.appendChild(li);
        }
    }

    render();
    document.addEventListener('pim:styles-changed', render);

    newBtn.addEventListener('click', () => openModal(null));
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (!modal.hidden && e.key === 'Escape') closeModal();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const promptSuffix = suffixInput.value.trim();
        const description = descInput.value.trim();
        if (!name || !promptSuffix) return;
        StylesStore.upsert({
            id: editingId || undefined,
            name,
            promptSuffix,
            description,
        });
        closeModal();
    });

    exportBtn.addEventListener('click', () => {
        const json = StylesStore.exportJson();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'styles.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Reset to default styles? Your customizations will be removed.')) {
            StylesStore.resetAll();
        }
    });
});
