document.addEventListener('DOMContentLoaded', async () => {
    const user = await requirePageAuth();
    if (!user) return; // redirecting to login

    const form = document.getElementById('generateForm');
    const promptInput = document.getElementById('promptInput');
    const styleSelect = document.getElementById('styleSelect');
    const aspectSelect = document.getElementById('aspectSelect');
    const modelSelect = document.getElementById('modelSelect');
    const submitBtn = document.getElementById('submitBtn');
    const errorBanner = document.getElementById('errorBanner');
    const results = document.getElementById('results');
    const refInput = document.getElementById('refInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const refPreviews = document.getElementById('refPreviews');

    // ----- Reference images (image-to-image) -----
    const MAX_REFS = 4;
    const MAX_REF_BYTES = 10 * 1024 * 1024; // 10MB
    const referenceFiles = [];

    uploadBtn.addEventListener('click', () => refInput.click());

    // Add files from the upload button or a clipboard paste, applying the
    // model/size/count limits. Returns how many were actually added.
    function addReferenceFiles(files) {
        if (!modelSupportsReferences(modelSelect.value)) {
            setError('Reference images only work with the gpt-image models. Switch the model first.');
            return 0;
        }
        let added = 0;
        for (const file of files) {
            if (referenceFiles.length >= MAX_REFS) {
                setError(`You can attach up to ${MAX_REFS} reference images.`);
                break;
            }
            if (file.size > MAX_REF_BYTES) {
                setError(`"${file.name || 'image'}" is too large (max 10MB).`);
                continue;
            }
            referenceFiles.push(file);
            added++;
        }
        if (added) renderRefPreviews();
        return added;
    }

    refInput.addEventListener('change', () => {
        addReferenceFiles(Array.from(refInput.files || []));
        refInput.value = '';
    });

    // Paste an image anywhere in the composer to attach it as a reference.
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        const files = [];
        for (const item of items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) files.push(file);
            }
        }
        if (files.length) {
            e.preventDefault();
            addReferenceFiles(files);
        }
    });

    function renderRefPreviews() {
        refPreviews.innerHTML = '';
        referenceFiles.forEach((file, i) => {
            const item = document.createElement('div');
            item.className = 'prompt-ref';
            const img = document.createElement('img');
            img.alt = file.name;
            img.src = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(img.src);
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'prompt-ref__remove';
            remove.setAttribute('aria-label', `Remove ${file.name}`);
            remove.textContent = '\u00d7';
            remove.addEventListener('click', () => {
                referenceFiles.splice(i, 1);
                renderRefPreviews();
            });
            item.appendChild(img);
            item.appendChild(remove);
            refPreviews.appendChild(item);
        });
        refPreviews.hidden = referenceFiles.length === 0;
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result);
                resolve(result.slice(result.indexOf(',') + 1));
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    // Only the gpt-image models support reference images, so the upload button
    // only appears for them. Switching to an unsupported model clears any
    // images already attached.
    function modelSupportsReferences(model) {
        return model.startsWith('gpt-image');
    }

    function updateRefAvailability() {
        const supported = modelSupportsReferences(modelSelect.value);
        uploadBtn.hidden = !supported;
        if (!supported && referenceFiles.length) {
            referenceFiles.length = 0;
            renderRefPreviews();
        }
    }

    modelSelect.addEventListener('change', updateRefAvailability);
    updateRefAvailability();

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
    document.addEventListener('pic:styles-changed', refreshStyles);

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

    function renderResults(urls) {
        results.innerHTML = '';
        urls.forEach((url, i) => {
            const card = document.createElement('div');
            card.className = 'result';

            const img = document.createElement('img');
            img.className = 'result__img';
            img.alt = `Generated image ${i + 1}`;
            img.src = url;

            const actions = document.createElement('div');
            actions.className = 'result__actions';

            const downloadBtn = document.createElement('button');
            downloadBtn.type = 'button';
            downloadBtn.className = 'result__btn';
            downloadBtn.textContent = 'Download';
            downloadBtn.addEventListener('click', async () => {
                try {
                    const blob = await (await fetch(url)).blob();
                    const objUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = objUrl;
                    a.download = `pic-${Date.now()}-${i + 1}.png`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
                } catch {
                    window.open(url, '_blank', 'noopener');
                }
            });

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'result__btn';
            copyBtn.textContent = 'Copy';
            copyBtn.addEventListener('click', async () => {
                try {
                    const blob = await (await fetch(url)).blob();
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
        const model = modelSelect.value;

        if (referenceFiles.length > 0 && !model.startsWith('gpt-image')) {
            setError('Reference images only work with the gpt-image models. Switch the model or remove the images.');
            return;
        }

        submitBtn.disabled = true;
        renderSkeletons(1);

        let referenceImages = [];
        try {
            referenceImages = await Promise.all(
                referenceFiles.map(async (file) => ({
                    b64: await fileToBase64(file),
                    mime: file.type || 'image/png',
                })),
            );
        } catch {
            submitBtn.disabled = false;
            results.innerHTML = '';
            setError('Could not read a reference image. Try removing and re-adding it.');
            return;
        }

        const { job, error: createError } = await createGenerationJob({ prompt: finalPrompt, size, model, referenceImages });
        if (createError) {
            submitBtn.disabled = false;
            results.innerHTML = '';
            if (createError.status === 401) {
                setError('Your session expired. Redirecting to sign-in…');
                setTimeout(() => location.replace('login.html'), 1200);
            } else {
                setError(createError.message || 'Generation failed.');
            }
            return;
        }

        const { job: finished, error: pollError } = await pollJob(job.id);
        submitBtn.disabled = false;

        if (pollError) {
            results.innerHTML = '';
            if (pollError.status === 401) {
                setError('Your session expired. Redirecting to sign-in…');
                setTimeout(() => location.replace('login.html'), 1200);
            } else {
                setError(pollError.message || 'Generation failed.');
            }
            return;
        }

        if (!finished || finished.status === 'failed') {
            results.innerHTML = '';
            setError(finished?.error || 'Generation failed.');
            return;
        }

        renderResults(finished.imageUrls || []);
    });
});
