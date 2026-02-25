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
├── phase3-positions-data.js    # Phase 3 positions (1–155): name, help, description, intensity, group, etc.
├── public/                      # Static assets, ONNX/Kokoro WASM
├── scripts/                     # Build: copy-public-assets, list-music; download-onnx-wasm, download-kokoro-model
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
