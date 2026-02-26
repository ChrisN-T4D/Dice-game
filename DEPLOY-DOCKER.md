# Docker deployment checklist

## Files used by Docker

| File | Purpose |
|------|--------|
| `Dockerfile` | Multi-stage: Node 20 Alpine build → nginx Alpine serve |
| `nginx.conf` | SPA fallback, COOP/COEP headers, `.wasm` MIME, `/onnxe-wasm/` alias |
| `docker-compose.yml` | Optional: one service, build `.`, port 3000→80 |
| `.dockerignore` | Excludes `node_modules`, `dist`, `.git`, `.cursor`, `.vscode`, `.env` |

## Build flow

1. **Install**: `npm ci` (requires `package-lock.json` in repo).
2. **Build**: `npm run build` = `copy-public-assets.js` → `list-music.js` → `vite build`.
   - `copy-public-assets.js` copies root `Position References` and `Background` into `public/` (skips if missing).
   - `list-music.js` writes `public/music/manifest.json` (creates `public/music/` if missing).
   - Vite builds into `dist/` and copies `public/` into `dist/`.
3. **Serve**: nginx serves `dist/` at port 80.

## Verify locally

```bash
docker build -t dice-game:latest .
docker run -p 3000:80 dice-game:latest
```

Then open **http://localhost:3000** (admin: **http://localhost:3000/#admin**).

## Portainer

- **Stacks** → **Add stack** → use **Build from Git** with repo + branch, Compose path `docker-compose.yml`, or paste the stack YAML.
- Set the **HOST** environment variable in the stack (Traefik hostname); the compose file uses only `HOST` (no default).
- First deploy builds the image (can take several minutes); redeploy to rebuild after code changes.

### "Pull access denied for dice-game"

If Portainer tries to **pull** `dice-game:latest` from Docker Hub, it will fail (that image isn’t on Docker Hub). Either:

- **Build from Git:** Use **Build from Git** with Compose path `docker-compose.yml` so the stack **builds** the image from the repo (don’t rely on “Pull and redeploy” alone).
- **Pull from registry:** Use Compose path `docker-compose.registry.yml` (default image `ghcr.io/chrisn-t4d/dice-game:latest`). Add GHCR as a registry in Portainer if the package is private, then “Pull and redeploy” will pull from GHCR.

### Why "Pull and redeploy" doesn’t update the app

For stacks that use **Build from Git** with `build: .` in the compose file, **Pull and redeploy** only re-fetches the compose file and redeploys. It does **not** rebuild the image, so the stack keeps using the existing `dice-game:latest` image and your new code never runs.

**Options:**

1. **Rebuild in Portainer (one-off)**  
   Open the stack → **Editor** (or **Update the stack**). If your Portainer version offers a rebuild step (e.g. “Build image” or “Rebuild” before deploy), use it so the image is rebuilt from the latest Git source, then redeploy.

2. **Use a registry image (recommended for updates)**  
   Build the image in CI (e.g. GitHub Actions), push it to a registry (e.g. GHCR), and deploy from that image so “Pull and redeploy” pulls a new image instead of reusing a local one. See [Deploy from registry](#deploy-from-registry) below.

## Deploy from registry (GitHub builds image, Portainer pulls it)

**Flow:** Push to `main` → GitHub Actions builds the Docker image and pushes it to GitHub Container Registry (GHCR). Portainer uses the registry compose file and pulls that image; “Pull and redeploy” then updates the app.

1. **GitHub (already set up)**  
   `.github/workflows/docker-publish.yml` runs on every push to `main`, builds the image, and pushes to **ghcr.io/chrisn-t4d/dice-game:latest** (GHCR uses lowercase owner/repo).

2. **Portainer**
   - **Add/Edit stack** → **Repository** (or Web editor).
   - **Compose path:** `docker-compose.registry.yml` (or paste its contents). The default image is `ghcr.io/chrisn-t4d/dice-game:latest`.
   - **Environment:** Set **HOST** = your Traefik hostname. Optionally set **DICE_GAME_IMAGE** if you use a different tag.
   - Enable **Re-pull image** so “Pull and redeploy” pulls the latest image from GHCR.
   - Deploy. Portainer will pull the image from GitHub; no build on the server.

3. **First time / private package**
   - In GitHub: **Packages** → open the `dice-game` package → **Package settings** → set visibility to **Public** if the server doesn’t log in to GHCR.
   - If the package is private: in Portainer add **Registries** → GHCR, and use a GitHub PAT with `read:packages`.

## Notes

- `package-lock.json` must be committed so `npm ci` works in the image.
- Position reference images: ensure `Position References` (root) or `public/Position References` is in the repo so admin images load; the build script copies root → public when present.
- Large assets (e.g. `public/models/`, `public/music/`) are included in the image; consider Git LFS or external storage if the image size is an issue.
