# Docker deployment checklist

## Files used by Docker

| File | Purpose |
|------|--------|
| `Dockerfile` | Multi-stage: Node 20 Alpine build → nginx Alpine serve |
| `nginx.conf.template` | `entrypoint.sh` substitutes `__NGINX_PORT__` from `PORT` (default 80) |
| `docker-compose.yml` | Build from Git: app only, Traefik labels |
| `docker-compose.registry.yml` | Pull from GHCR only; use for Portainer "Pull and redeploy" |
| `.dockerignore` | Excludes `node_modules`, `dist`, `.git`, `.cursor`, `.vscode`, `.env` |

## Build flow (app)

1. **Install**: `npm ci` (requires `package-lock.json` in repo).
2. **Build**: `npm run build` = `copy-public-assets.js` → `list-music.js` → `vite build`.
3. **Serve**: nginx serves `dist/`; `entrypoint.sh` writes `default.conf` from the template using **`PORT`** (default **80**).

## Verify locally

```bash
docker build -t dice-game:latest .
docker run -p 3000:80 dice-game:latest
```

Then open **http://localhost:3000** (admin: **http://localhost:3000/#admin**).

---

## Portainer: pull and redeploy (recommended)

Use this so **Pull and redeploy** in Portainer updates the app from GitHub after each push to `main`.

### One-time setup (primary or backup server)

1. **GitHub**
   - On every push to `main`, `.github/workflows/docker-publish.yml` builds and pushes **ghcr.io/&lt;org&gt;/&lt;repo&gt;:latest** (and `:SHA`).
   - If the repo/package is private: **Settings** → **Packages** → create a PAT with `read:packages` and add it in Portainer as a registry (see below).

2. **Portainer**
   - **Stacks** → **Add stack** (or use **Web editor**).
   - **Build method**: **Git repository** (or paste compose).
   - **Repository URL**: your repo (e.g. `https://github.com/ChrisN-T4D/Dice-game.git`).
   - **Repository reference**: `main` (or your branch).
   - **Compose path**: **docker-compose.registry.yml**
   - **Environment variables** (required for Traefik stacks):
     - **HOST** = your Traefik hostname (e.g. `app.example.com`). App is at `https://HOST`.
   - Optional: **DICE_GAME_IMAGE** if you use a different registry/tag.
   - Enable **Re-pull image before deploy** (or equivalent) so each redeploy pulls the latest image.
   - Deploy.

3. **Private GHCR (if needed)**
   - Portainer → **Registries** → **Add registry** → **GitHub**. Use a GitHub PAT with `read:packages`.

### Updating the app (pull and redeploy)

- **Stacks** → open the Dice game stack → **Pull and redeploy** (or **Update the stack** and redeploy).
- Portainer pulls the latest app image from GHCR and recreates the container. No build on the server.

### Backup server

- On a second Portainer host, repeat the same one-time setup with **Compose path** = `docker-compose.registry.yml` and **HOST** as appropriate, **Re-pull image** enabled.

---

## Portainer: build from Git (alternative)

If you prefer to build on the server instead of using the registry:

- **Compose path**: `docker-compose.yml` (not the registry file).
- Set **HOST** in the stack if your Traefik rules need it.
- First deploy builds the app image (can take several minutes).

---

## Notes

- `package-lock.json` must be committed so `npm ci` works in the image.
- Position reference images: ensure `Position References` (root) or `public/Position References` is in the repo so admin images load.
- Voice: Kokoro runs in the browser; optional static WAVs via image build or `AUDIO_ASSETS_URL` (see [PORTAINER-URL-SETUP.md](PORTAINER-URL-SETUP.md)).
