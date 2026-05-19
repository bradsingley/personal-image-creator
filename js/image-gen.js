/**
 * Wrapper around the lab-api /personal-image-maker/generate-image endpoint.
 */
async function generateImages({ prompt, size, n, model }) {
    const { data, error } = await api('/personal-image-maker/generate-image', {
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

    if (error) return { images: [], error };

    const images = (data?.data || [])
        .map((d) => d?.b64_json)
        .filter(Boolean);

    if (images.length === 0) {
        return { images: [], error: { message: 'No images returned', status: 200 } };
    }
    return { images, error: null };
}
