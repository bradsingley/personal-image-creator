document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('generateForm');
    const promptInput = document.getElementById('promptInput');
    const styleSelect = document.getElementById('styleSelect');
    const aspectSelect = document.getElementById('aspectSelect');
    const countSelect = document.getElementById('countSelect');
    const modelSelect = document.getElementById('modelSelect');
    const submitBtn = document.getElementById('submitBtn');
    const errorBanner = document.getElementById('errorBanner');
    const results = document.getElementById('results');
    const moreOptionsToggle = document.getElementById('moreOptionsToggle');
    const moreOptionsRow = document.getElementById('moreOptions');

    // More options expand/collapse
    moreOptionsToggle.addEventListener('click', () => {
        const expanded = moreOptionsToggle.getAttribute('aria-expanded') === 'true';
        moreOptionsToggle.setAttribute('aria-expanded', String(!expanded));
        moreOptionsRow.hidden = expanded;
    });

    // Populate style dropdown
    async function refreshStyles() {
        await StylesStore.ensureLoaded();
        const styles = StylesStore.getAll();
        const currentValue = styleSelect.value;
        styleSelect.innerHTML = '';
        const none = document.createElement('option');
        none.value = '';
        none.textContent = 'No style';
        styleSelect.appendChild(none);
        for (const s of styles) {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            styleSelect.appendChild(opt);
        }
        if (currentValue) styleSelect.value = currentValue;
    }
    await refreshStyles();
    document.addEventListener('pim:styles-changed', refreshStyles);

    // Cmd/Ctrl+Enter submits
    promptInput.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            form.requestSubmit();
        }
    });

    function setError(msg) {
        if (!msg) {
            errorBanner.hidden = true;
            errorBanner.textContent = '';
            return;
        }
        errorBanner.textContent = msg;
        errorBanner.hidden = false;
    }

    function renderSkeletons(n) {
        results.innerHTML = '';
        for (let i = 0; i < n; i++) {
            const div = document.createElement('div');
            div.className = 'result result--skeleton';
            results.appendChild(div);
        }
    }

    function renderResults(images) {
        results.innerHTML = '';
        images.forEach((b64, i) => {
            const card = document.createElement('div');
            card.className = 'result';

            const img = document.createElement('img');
            img.className = 'result__img';
            img.alt = `Generated image ${i + 1}`;
            img.src = `data:image/png;base64,${b64}`;

            const actions = document.createElement('div');
            actions.className = 'result__actions';

            const downloadBtn = document.createElement('button');
            downloadBtn.type = 'button';
            downloadBtn.className = 'result__btn';
            downloadBtn.textContent = 'Download';
            downloadBtn.addEventListener('click', () => {
                const a = document.createElement('a');
                a.href = img.src;
                a.download = `pim-${Date.now()}-${i + 1}.png`;
                a.click();
            });

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'result__btn';
            copyBtn.textContent = 'Copy';
            copyBtn.addEventListener('click', async () => {
                try {
                    const blob = await (await fetch(img.src)).blob();
                    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                    copyBtn.textContent = 'Copied!';
                    copyBtn.classList.add('result__btn--copied');
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                        copyBtn.classList.remove('result__btn--copied');
                    }, 1500);
                } catch {
                    copyBtn.textContent = 'Copy failed';
                    setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
                }
            });

            actions.appendChild(downloadBtn);
            actions.appendChild(copyBtn);
            card.appendChild(img);
            card.appendChild(actions);
            results.appendChild(card);
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setError(null);

        const userPrompt = promptInput.value.trim();
        if (!userPrompt) {
            setError('Enter a prompt to start.');
            return;
        }

        const selectedStyle = styleSelect.value ? StylesStore.get(styleSelect.value) : null;
        const finalPrompt = selectedStyle?.promptSuffix
            ? `${userPrompt}${selectedStyle.promptSuffix}`
            : userPrompt;

        const size = aspectSelect.value;
        const n = parseInt(countSelect.value, 10);
        const model = modelSelect.value;

        submitBtn.disabled = true;
        renderSkeletons(n);

        const { images, error } = await generateImages({ prompt: finalPrompt, size, n, model });
        submitBtn.disabled = false;

        if (error) {
            results.innerHTML = '';
            if (error.status === 401) {
                setError('You need to sign in to lab-api before generating. Visit lab.bradsingley.com/mudbord and log in, then come back.');
            } else {
                setError(error.message || 'Generation failed.');
            }
            return;
        }
        renderResults(images);
    });
});
