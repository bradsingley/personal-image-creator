# personal-image-creator

Personal Image Creator (PIC) — a small lab project for generating images with managed preset styles. Loosely inspired by the MAI image generator UI.

## Pages
- `index.html` — Generator: prompt + style + aspect ratio + count + model.
- `styles.html` — Styles manager: add / edit / delete preset prompt suffixes.
- `login.html` / `signup.html` — better-auth sign-in / account creation, scoped to `.bradsingley.com` (same session as other lab apps).

## Backend
Calls `POST https://api.bradsingley.com/personal-image-creator/generate-image` (lab-api). Cookie-auth via better-auth on `.bradsingley.com`.

The lab-api route is defined in `lab-api/src/routes/personal-image-creator.ts` and proxies Azure OpenAI `gpt-image-1.5`.

## Styles
- Seed presets live in `data/styles.json` and are committed to the repo.
- Edits via the Styles page write to localStorage as overrides.
- "Export styles.json" downloads a merged JSON so changes can be committed back.
- "Reset to defaults" clears all overrides.

## Local dev
Open `index.html` directly, or `python -m http.server` from this folder. CORS allows `http://localhost:3000` and `http://localhost:5173` against the lab-api.

