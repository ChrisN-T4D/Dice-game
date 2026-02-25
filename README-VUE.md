# Between Us – Vue 3 App

This project now has a **Vue 3 + Vite** front-end on the `update-to-vue` branch.

## Run the Vue app

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**. You’ll see the landing modal; choose **Dice game** or **Guided Mode**. Dice game is implemented (phase 1–3 rolls and prompts). Guided Mode shows a placeholder for now.

## Legacy app (unchanged behavior)

The original single-page app is preserved as **`index-legacy.html`**. To use it:

- Serve the project root with any static server (e.g. Live Server, `npx serve .`) and open **`index-legacy.html`**, or
- Keep using your current workflow; the legacy scripts (`main.js`, `guided-mode.js`, `free-play.js`, etc.) are unchanged.

## What’s in the Vue version

- **Vue 3** + **Vite** + **Pinia**
- **Landing modal** → choose Guided or Dice game
- **Preferences sidebar** (prompt detail, penetration, background, anal/vibrator options, check-in)
- **Dice game**: Phase 1/2 (location + action) and Phase 3 (position + modifier) with roll buttons and prompt output
- **Phase and background** applied to `body` so existing CSS theme (phase colors, background images) still works
- **Data**: `phase3-positions-data.js` is imported as ESM (exports added at the bottom). Node scripts in `scripts/` still read that file as text, so they are unchanged.
- **Guided Mode**: placeholder only; full guided flow (wizard, timers, turns) can be ported later.

## Build for production

```bash
npm run build
```

- **Output** is in **`dist/`**. Deploy the contents of `dist/` to any static host (GitHub Pages, Netlify, Vercel, or any web server).
- **Assets**: The build runs **`scripts/copy-public-assets.js`** first, which copies **Position References/** and **Background/** from the project root into **`public/`**, so they are included in `dist/` automatically. No manual copy needed.
- **Base URL**: If you deploy to a subpath (e.g. `https://example.com/game/`), set the base in **`vite.config.js`** (`base: '/game/'`) and rebuild.

## Project layout

- **`src/`** – Vue app: `main.js`, `App.vue`, `components/`, `stores/`, `data/`, `assets/`
- **`public/`** – Static assets; **Position References** and **Background** are copied here automatically before each build (see `scripts/copy-public-assets.js`)
- **`index.html`** – Vite entry (Vue app)
- **`index-legacy.html`** – Original app (unchanged)
- **`phase3-positions-data.js`** – Shared position data (ESM exports added for Vue; scripts still use it as text)
- **`scripts/`** – Node tooling (export, compare, check-similarity) unchanged
