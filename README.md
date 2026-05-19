# personal-image-maker

A small lab project for generating images with managed preset styles. Loosely inspired by the MAI image generator UI.

## Pages
- `index.html` — Generator: prompt + style + aspect ratio + count + model.
- `styles.html` — Styles manager: add / edit / delete preset prompt suffixes.

## Backend
Calls `POST https://api.bradsingley.com/personal-image-maker/generate-image` (lab-api). Cookie-auth via better-auth on `.bradsingley.com` — sign in to any sister lab app first (e.g. mudbord).

The lab-api route is defined in `lab-api/src/routes/personal-image-maker.ts` and proxies Azure OpenAI `gpt-image-1.5`.

## Styles
- Seed presets live in `data/styles.json` and are committed to the repo.
- Edits via the Styles page write to localStorage as overrides.
- "Export styles.json" downloads a merged JSON so changes can be committed back.
- "Reset to defaults" clears all overrides.

## Local dev
Open `index.html` directly, or `python -m http.server` from this folder. CORS allows `http://localhost:3000` and `http://localhost:5173` against the lab-api.

