# Between Us

A Vue 3 app for intimate dice-based play: **Dice game** (freeplay) and **Guided Mode** (timed turns, TTS, phases). Admin lets you edit position/location text and compare images to descriptions.

---

## Tech stack

- **Vue 3** (Composition API, `<script setup>`)
- **Pinia** (session, preferences, profile, guided stores)
- **Vite** (build, dev server, `@` → `src/`, `phase3-data` → `phase3-positions-data.js`)
- **TTS**: Piper (local), Kokoro (local), Edge TTS (optional); TTS runs in a **Web Worker** so the main thread stays responsive.

---

## Project structure

```
Dice-game/
├── index.html
├── package.json
├── vite.config.js
├── phase3-positions-data.js     # Phase 3 positions (1–155); Vite alias "phase3-data"; scripts export → position-entries-by-number.json
├── position-entries-by-number.json  # Export/copy of phase3 data for scripts (apply-position-mapping, validation)
├── legacy/                      # Vanilla JS app (index-legacy.html + main, state, guided-mode, free-play, clothing, etc.)
├── public/                      # Static assets, ONNX/Kokoro WASM
├── scripts/                     # Build & data: copy-public-assets, export-positions-from-js, apply-position-mapping, etc.
└── src/
    ├── main.js                  # Vue app mount, global error handler
    ├── App.vue                   # Root: admin vs main app; main = onboarding, landing, play mode (freeplay/guided)
    ├── assets/
    │   └── styles.css            # Global styles
    ├── components/
    │   ├── FreePlayView.vue      # Dice game UI: phase, rolls, prompt, summary
    │   ├── GuidedModeView.vue     # Guided UI: countdown, instruction, next/settle, break timers
    │   ├── GuidedPlaceholder.vue  # Placeholder when guided not started
    │   ├── GuidedSetupWizard.vue  # Guided config: partner names, phase distribution, time, options
    │   ├── LandingModal.vue       # Choose Dice game or Guided Mode
    │   ├── OnboardingWizard.vue   # First-time onboarding + tour
    │   ├── PreferencesSidebar.vue # Settings: names, anatomy, voice, music, background
    │   ├── SummaryOverlay.vue     # Phase 1/2/3 tables (read-only summary)
    │   └── TimerBar.vue           # Phase timer (freeplay)
    ├── composables/
    │   ├── useBackgroundMusic.js  # Playlist, play/stop, volume
    │   └── useSpeech.js           # TTS: Piper/Kokoro/Edge, worker, speak, preparePhrase, voice lists
    ├── data/
    │   ├── clothing.js           # Clothing removal table and helpers
    │   ├── music.js               # Music manifest / playlists
    │   └── tables.js              # phase1And2Tables, phase3Modifiers, randomRollsForPhase
    ├── stores/
    │   ├── guided.js              # Guided mode: state, startGuidedMode, performGuidedTurn, breaks, TTS preload
    │   ├── preferences.js         # UI prefs: names, anatomy, voice, music, background, etc.
    │   ├── profile.js             # Onboarding complete, suggested mode, voice language/gender
    │   └── session.js             # phase, rollCount, maxPhase, uiMode (freeplay/guided), showLanding
    ├── utils/
    │   ├── adminEdits.js          # Admin localStorage: Phase 3 edits, Phase 1/2 table edits, Phase 1/2 images
    │   ├── persistence.js         # loadState / saveState (session, preferences, guided) → intimacyGameState
    │   └── promptHelper.js        # getPromptText(phase, locationRoll, actionRoll, giver, receiver, names, anatomy)
    ├── views/
    │   └── AdminView.vue          # Admin: password gate; Phase 3 (image + name/help/description, validation); Phase 1&2 tables; modifiers
    └── workers/
        └── tts.worker.js          # TTS in worker: Piper/Kokoro queue, post blob or error
```

**Where things live:** The main app is Vue (`index.html` → `src/main.js`). The old vanilla JS app is in **legacy/** (`legacy/index-legacy.html`); it still loads `../phase3-positions-data.js` from the repo root. Phase 3 data and the JSON export stay at root so Vite and `scripts/` can reference them without path changes.

---

## How the pieces fit together

### Entry and routing

- **main.js** creates the app, uses Pinia, mounts `App.vue`.
- **App.vue**:
  - If `window.location.hash === '#admin'` → show **AdminView** (password-protected).
  - Else: show onboarding (if incomplete), then landing (choose mode), then main content.
  - Main content: **FreePlayView** (Dice game) or **GuidedModeView** (Guided Mode) plus **PreferencesSidebar**, **SummaryOverlay**, **TimerBar** as needed.

### Data and prompts

- **Phase 1 & 2**: Locations and actions come from `src/data/tables.js` (`phase1And2Tables`). Admin overrides are in `adminEdits.js` (Phase 1/2 table edits). **promptHelper.js** uses `mergePhase12Table(base, phase)` so in-game text uses admin edits when present.
- **Phase 3**: Positions come from **phase3-positions-data.js** (alias `phase3-data`). Admin overrides (name, help, description per position) are in `adminEdits.js`. **promptHelper.js** uses `mergePhase3Entry(baseEntry, pos)` and builds instruction from position name, help, and modifier (from `phase3Modifiers` in `tables.js`).
- **promptHelper.getPromptText** returns `{ where, what, instruction }` with partner names and anatomy (vulva/penis) substituted. Used by the guided store and by FreePlayView for display.

### Guided mode

- **stores/guided.js**: Holds config (time, phases, options), current prompt, break state. **startGuidedMode** sets up and runs intro + first turn. **performGuidedTurn** rolls location/action (or position + modifier in Phase 3), calls **getPromptText**, stores prompt, handles clothing removal, and triggers TTS. Break timers (countdown, “next turn”, “settle in”) use fixed phrases; TTS runs in a worker and is preloaded so it doesn’t block.
- **useSpeech.js**: Wraps Piper/Kokoro/Edge, manages the TTS worker, **speak()** and **preparePhrase()** for preload.
- **GuidedSetupWizard**: Collects partner names, phase distribution, total time, turn/pause lengths, options; on complete, starts the session (guided store).
- **GuidedModeView**: Shows current instruction, next/settle buttons, break UI; delegates speaking and flow to the guided store.

### Admin

- **AdminView.vue**: Password gate (localStorage + sessionStorage). When unlocked: **Phase 3** tab = position 1–155, image + editable name/help/description, validation (reviewed / not reviewed), focus tags (penis/vulva/both). **Phase 1 & 2** tab = editable locations/actions and optional image path per location. **Modifiers** tab = read-only Phase 3 modifiers.
- **adminEdits.js**: All admin persistence (Phase 3 edits, Phase 1/2 table edits, Phase 1/2 images). Merge helpers (**mergePhase3Entry**, **mergePhase12Table**) are used by **promptHelper** and **SummaryOverlay** so the game and summary show admin-edited text.

### Persistence

- **persistence.js**: **loadState** / **saveState** read/write `intimacyGameState` in localStorage (session, preferences, guided snapshot). App restores on load; a watcher schedules saves when relevant store state changes.

---

## Scripts

| Script | Purpose |
|--------|--------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Copy public assets, list music, then Vite build |
| `npm run preview` | Preview production build |
| `npm run download-onnx-wasm` | Fetch ONNX runtime WASM for Piper |
| `npm run download-kokoro-model` | Fetch Kokoro TTS model |
| `npm run generate-static-wavs` | Generate all fixed-phrase WAVs into `public/audio/static/<voiceId>/` (run after Kokoro model; use `--local` if model is in `public/models/`) |
| `npm run list-music` | Generate music manifest (used by build) |

---

## Code layout conventions

- **Section comments**: Larger files use `// -----------------------------------------------------------------------------` and a short section title (e.g. “Phase 3: position edits”, “Auth (password gate)”) so you can scan and jump.
- **File-level JSDoc**: Top of key files (e.g. `adminEdits.js`, `promptHelper.js`, `guided.js`, `AdminView.vue`) describe the file’s role in one or two sentences.
- **Stores**: Pinia stores in `src/stores/`; guided store is the largest and is split into helpers/constants, state, and actions in comments.
- **Data**: Static tables in `src/data/`; Phase 3 positions in root `phase3-positions-data.js` (alias `phase3-data` in Vite).
- **Utils**: Pure helpers and persistence in `src/utils/`; no UI.

---

## Admin and images

- Admin is available when the URL hash is `#admin` (e.g. triple-click app title to set hash).
- Phase 3 images are served from the **Position References** folder at project root; Vite dev server serves it at `/Position%20References`. Admin shows “Image — N” for position N and expects files like `position 1.png` in that folder.

---

## Deploy with Docker / Portainer

The app is containerized with a multi-stage Dockerfile (Node build + nginx serve).

### Build and run locally

```bash
docker build -t dice-game:latest .
docker run -p 3000:80 dice-game:latest
```

Then open **http://localhost:3000**.

### Deploy in Portainer

1. **Add the stack** – In Portainer: **Stacks** → **Add stack**. Name: e.g. `dice-game`.
2. **Build from Git** – **Build method**: Git repository. **Repository URL**: your repo (e.g. `https://github.com/ChrisN-T4D/Dice-game.git`). **Repository reference**: branch (e.g. `update-to-vue`). **Compose path**: `docker-compose.yml`.
3. **Or paste the stack** – **Web editor** → paste the contents of `docker-compose.yml` (build, image, ports, restart). If using Git, set Build method to Git so Portainer runs `docker build` from the Dockerfile.
4. **Deploy** – Click **Deploy the stack**. First build can take a few minutes.
5. **Access** – Open **http://&lt;your-server&gt;:3000**. Admin: **http://&lt;your-server&gt;:3000/#admin**.

### Static audio (Docker image vs download at startup)

`npm run build` copies everything under **`public/`** into **`dist/`**, including **`public/audio/static/...`**. The root **`.dockerignore`** no longer excludes `public/audio`, so **Railway / Portainer builds that include committed WAVs** also serve **`/audio/static/<voiceId>/<phraseId>.wav`** from nginx without extra setup.

**Optional: smaller image + download at startup** — If you keep WAVs out of git (or want a slimmer image), use **`AUDIO_ASSETS_URL`**:

1. **Create the tarball** (once, on a machine that has `public/audio`):  
   `npm run pack-audio-assets`. This creates `audio-assets.tar.gz` in the repo root (~1.7 GB).
2. **Upload** `audio-assets.tar.gz` somewhere reachable (e.g. GitHub Release, S3, or your own server).
3. Set **`AUDIO_ASSETS_URL`** to the **direct** download URL of that file.
4. On container **start**, the entrypoint downloads the tarball and extracts it so `/audio/static/...` is served. It only downloads once (skips if already present).

**Full step-by-step and URL troubleshooting:** see **[PORTAINER-URL-SETUP.md](PORTAINER-URL-SETUP.md)** (audio URL, TTS/config.json, and why the server URL might not have worked).

If there are no WAVs in the built **`dist`** and `AUDIO_ASSETS_URL` is unset, the app still runs; static phrase requests **404** and **`useSpeech`** falls back to TTS for those phrases.

### How to update static audio after changing scripts or phrase text

1. **Keep phrase data in sync**  
   The app uses `src/data/staticPhrases.js`; the generators use `scripts/staticPhraseData.js`. If you change **wording** or **which phrases exist**, update both so IDs and text match (see comments in `staticPhraseData.js`).

2. **Regenerate WAVs** (requires Kokoro model and Node):
   ```bash
   npm run generate-static-wavs
   ```
   Use `--local` if the model is in `public/models/` (e.g. after `npm run download-kokoro-model`). To limit to one voice or one phrase:
   ```bash
   npm run generate-static-wavs -- --local --voice af_nicole
   npm run generate-static-wavs -- --local --phrase ease_in_1
   ```
   **By default, existing WAVs are overwritten**—so re-running after changing phrase text updates those files. Use `--skip-existing` to only generate missing files (faster when adding new phrases). Output goes to `public/audio/static/<voiceId>/<phraseId>.wav`.

3. **Verify** (optional):
   ```bash
   npm run check-static-wavs
   ```

4. **For Docker / Portainer**  
   Repack and re-upload so containers get the new audio:
   ```bash
   npm run pack-audio-assets
   ```
   Then upload the new `audio-assets.tar.gz` (e.g. as a new release asset or replace the existing one) and set `AUDIO_ASSETS_URL` to its URL. **Redeploy** the stack. If the container already downloaded audio once, remove the volume (or the container) so the entrypoint downloads again, or use a new release URL so the marker path changes.

### Notes

- The image builds the Vue app and serves it with nginx; the listen port comes from **`PORT`** (default **80**; Railway sets `PORT` automatically). Map to any host port in Docker (e.g. `-p 3000:80`).
- `nginx.conf.template` defines SPA fallback, COOP/COEP headers, and MIME types for WASM; the entrypoint substitutes `__NGINX_PORT__` at startup.
- **Railway:** see [docs/RAILWAY.md](docs/RAILWAY.md) for `PORT`, `TTS_SERVER_URL`, and optional `Dockerfile.tts` service.
- To update: pull latest in the stack and **Redeploy**.
