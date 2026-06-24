document.addEventListener('DOMContentLoaded', async () => {
    const user = await requirePageAuth();
    if (!user) return; // redirecting to login

    const grid = document.getElementById('library');
    const statusBanner = document.getElementById('statusBanner');
    const emptyState = document.getElementById('emptyState');

    function setStatus(msg) {
        if (!msg) {
            statusBanner.hidden = true;
            statusBanner.textContent = '';
            return;
        }
        statusBanner.textContent = msg;
        statusBanner.hidden = false;
    }

    async function downloadUrl(url, name) {
        try {
            const blob = await (await fetch(url)).blob();
            const objUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objUrl;
            a.download = name;
            a.click();
            setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
        } catch {
            window.open(url, '_blank', 'noopener');
        }
    }

    async function copyUrl(url, btn) {
        try {
            const blob = await (await fetch(url)).blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            btn.textContent = 'Copied!';
            btn.classList.add('result__btn--copied');
            setTimeout(() => {
                btn.textContent = 'Copy';
                btn.classList.remove('result__btn--copied');
            }, 1500);
        } catch {
            btn.textContent = 'Copy failed';
            setTimeout(() => (btn.textContent = 'Copy'), 1500);
        }
    }

    function buildCard(item, url, index) {
        const card = document.createElement('div');
        card.className = 'result';

        const img = document.createElement('img');
        img.className = 'result__img';
        img.alt = item.prompt ? item.prompt.slice(0, 120) : 'Generated image';
        img.loading = 'lazy';
        img.src = url;

        const actions = document.createElement('div');
        actions.className = 'result__actions';

        const downloadBtn = document.createElement('button');
        downloadBtn.type = 'button';
        downloadBtn.className = 'result__btn';
        downloadBtn.textContent = 'Download';
        downloadBtn.addEventListener('click', () =>
            downloadUrl(url, `pic-${item.id}-${index + 1}.png`),
        );

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'result__btn';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', () => copyUrl(url, copyBtn));

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'result__btn result__btn--danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', async () => {
            if (!confirm('Delete this image from your library?')) return;
            deleteBtn.disabled = true;
            const { error } = await deleteLibraryItem(item.id);
            if (error) {
                deleteBtn.disabled = false;
                setStatus(error.message || 'Could not delete that image.');
                return;
            }
            // Remove every card belonging to this generation.
            grid.querySelectorAll(`[data-job-id="${item.id}"]`).forEach((el) => el.remove());
            if (!grid.children.length) showEmpty();
        });

        actions.appendChild(downloadBtn);
        actions.appendChild(copyBtn);
        actions.appendChild(deleteBtn);
        card.appendChild(img);
        card.appendChild(actions);
        card.dataset.jobId = item.id;
        return card;
    }

    function showEmpty() {
        grid.innerHTML = '';
        emptyState.hidden = false;
    }

    async function load() {
        setStatus('Loading…');
        const { items, error } = await fetchLibrary();
        setStatus(null);

        if (error) {
            if (error.status === 401) {
                location.replace('login.html');
                return;
            }
            setStatus(error.message || 'Could not load your library.');
            return;
        }

        grid.innerHTML = '';
        const cards = [];
        for (const item of items) {
            (item.imageUrls || []).forEach((url, i) => cards.push(buildCard(item, url, i)));
        }

        if (cards.length === 0) {
            showEmpty();
            return;
        }
        emptyState.hidden = true;
        cards.forEach((c) => grid.appendChild(c));
    }

    await load();
});
