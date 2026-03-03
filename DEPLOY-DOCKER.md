# Docker deployment checklist

## Files used by Docker

| File | Purpose |
|------|--------|
| `Dockerfile` | Multi-stage: Node 20 Alpine build → nginx Alpine serve |
| `Dockerfile.tts` | TTS server (Node 20, Kokoro model in image) |
| `nginx.conf` | SPA fallback, COOP/COEP headers, `.wasm` MIME, `/onnx-wasm/` alias |
| `docker-compose.yml` | Build from Git: app + tts-server, Traefik labels |
| `docker-compose.registry.yml` | Pull from GHCR only; use for Portainer "Pull and redeploy" |
| `.dockerignore` | Excludes `node_modules`, `dist`, `.git`, `.cursor`, `.vscode`, `.env` |

## Build flow (app)

1. **Install**: `npm ci` (requires `package-lock.json` in repo).
2. **Build**: `npm run build` = `copy-public-assets.js` → `list-music.js` → `vite build`.
3. **Serve**: nginx serves `dist/` at port 80; `entrypoint.sh` writes `/config.json` (TTS URL) from `HOST`.

## Verify locally

```bash
docker build -t dice-game:latest .
docker run -p 3000:80 -e HOST=localhost dice-game:latest
```

Then open **http://localhost:3000** (admin: **http://localhost:3000/#admin**).

---

## Portainer: pull and redeploy (recommended)

Use this so **Pull and redeploy** in Portainer updates both the app and the TTS server from GitHub after each push to `main`.

### One-time setup (primary or backup server)

1. **GitHub**
   - On every push to `main`, `.github/workflows/docker-publish.yml` builds and pushes:
     - **ghcr.io/chrisn-t4d/dice-game:latest** (web app)
     - **ghcr.io/chrisn-t4d/dice-game:tts** (TTS server)
   - If the repo/package is private: **Settings** → **Packages** → create a PAT with `read:packages` and add it in Portainer as a registry (see below).

2. **Portainer**
   - **Stacks** → **Add stack** (or use **Web editor**).
   - **Build method**: **Git repository**.
   - **Repository URL**: `https://github.com/ChrisN-T4D/Dice-game.git` (or your fork).
   - **Repository reference**: `main` (or your branch).
   - **Compose path**: **docker-compose.registry.yml**
   - **Environment variables** (required):
     - **HOST** = your Traefik hostname (e.g. `app.example.com`). App is at `https://HOST`, TTS at `https://tts.HOST`.
   - Optional: **DICE_GAME_IMAGE**, **DICE_GAME_TTS_IMAGE** if you use a different registry/tag.
   - Enable **Re-pull image before deploy** (or equivalent) so each redeploy pulls the latest images.
   - Deploy.

3. **Private GHCR (if needed)**
   - Portainer → **Registries** → **Add registry** → **GitHub**. Use a GitHub PAT with `read:packages`.
   - The stack will then be able to pull `ghcr.io/chrisn-t4d/dice-game:*`.

### Updating the app (pull and redeploy)

- **Stacks** → open the Dice game stack → **Pull and redeploy** (or **Update the stack** and redeploy).
- Portainer pulls the latest `dice-game:latest` and `dice-game:tts` from GHCR and recreates the containers. No build on the server.

### Backup server

- On a second Portainer host (backup/failover), repeat the same one-time setup: add a stack with **Compose path** = `docker-compose.registry.yml`, **HOST** = the same or backup hostname, **Re-pull image** enabled.
- To refresh the backup after a release: **Pull and redeploy** the stack on the backup server so it gets the same images as the primary.

---

## Portainer: build from Git (alternative)

If you prefer to build on the server instead of using the registry:

- **Compose path**: `docker-compose.yml` (not the registry file).
- Set **HOST** in the stack.
- First deploy builds both images (can take several minutes).
- **Pull and redeploy** will **not** rebuild the images; it only re-pulls the compose file. To get new code you must **rebuild** the stack (if your Portainer has "Build image" / "Rebuild") or switch to the registry workflow above.

---

## Notes

- `package-lock.json` must be committed so `npm ci` works in the images.
- Position reference images: ensure `Position References` (root) or `public/Position References` is in the repo so admin images load.
- Large assets (e.g. `public/models/`, `public/music/`) are included in the app image; TTS image includes the Kokoro model.
