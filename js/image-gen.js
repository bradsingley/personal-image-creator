/**
 * Wrappers around the lab-api personal-image-creator endpoints.
 *
 * Generation is asynchronous: create a job, then poll it until it reaches a
 * terminal status. This keeps slow models from hitting the request timeout.
 */

const PIC_TERMINAL = new Set(['succeeded', 'failed']);

/** Create a generation job. Returns { job, error }. */
async function createGenerationJob({ prompt, size, n, model }) {
    const { data, error } = await api('/personal-image-creator/jobs', {
        method: 'POST',
        body: {
            prompt,
            size,
            n,
            model,
            quality: 'high',
            output_format: 'png',
        },
    });
    if (error) return { job: null, error };
    return { job: data?.job ?? null, error: null };
}

/** Fetch a single job's current state. Returns { job, error }. */
async function getJob(jobId) {
    const { data, error } = await api(`/personal-image-creator/jobs/${encodeURIComponent(jobId)}`);
    if (error) return { job: null, error };
    return { job: data?.job ?? null, error: null };
}

/**
 * Poll a job until it succeeds or fails (or times out client-side).
 * @param {string} jobId
 * @param {object} [opts]
 * @param {(job:object)=>void} [opts.onTick] called with each polled job state
 * @param {number} [opts.intervalMs] poll interval (default 3000)
 * @param {number} [opts.timeoutMs] max wait before giving up (default 600000 / 10 min)
 * @returns {Promise<{job:object|null, error:object|null}>}
 */
async function pollJob(jobId, { onTick, intervalMs = 3000, timeoutMs = 600000 } = {}) {
    const started = Date.now();
    for (;;) {
        const { job, error } = await getJob(jobId);
        if (error) return { job: null, error };
        if (onTick) onTick(job);
        if (job && PIC_TERMINAL.has(job.status)) return { job, error: null };
        if (Date.now() - started > timeoutMs) {
            return { job, error: { message: 'Timed out waiting for the image. Check the Library shortly.', status: 0 } };
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
}

/** List the signed-in user's stored images. Returns { items, error }. */
async function fetchLibrary() {
    const { data, error } = await api('/personal-image-creator/library');
    if (error) return { items: [], error };
    return { items: data?.items ?? [], error: null };
}

/** Delete a library item by id. Returns { error }. */
async function deleteLibraryItem(id) {
    const { error } = await api(`/personal-image-creator/library/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    return { error };
}
