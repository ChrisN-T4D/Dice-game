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
- First deploy builds the image (can take several minutes); redeploy to rebuild after code changes.

### Why "Pull and redeploy" doesn’t update the app

For stacks that use **Build from Git** with `build: .` in the compose file, **Pull and redeploy** only re-fetches the compose file and redeploys. It does **not** rebuild the image, so the stack keeps using the existing `dice-game:latest` image and your new code never runs.

**Options:**

1. **Rebuild in Portainer (one-off)**  
   Open the stack → **Editor** (or **Update the stack**). If your Portainer version offers a rebuild step (e.g. “Build image” or “Rebuild” before deploy), use it so the image is rebuilt from the latest Git source, then redeploy.

2. **Use a registry image (recommended for updates)**  
   Build the image in CI (e.g. GitHub Actions), push it to a registry (e.g. GHCR), and deploy from that image so “Pull and redeploy” pulls a new image instead of reusing a local one. See [Deploy from registry](#deploy-from-registry) below.

## Deploy from registry

If you build and push the image in CI (e.g. GitHub Actions to GHCR), use a compose file that only references the image (no `build:`). Then **Pull and redeploy** in Portainer will pull the new image and actually update the app.

- Use **Compose path** `docker-compose.registry.yml` when adding/editing the stack, **or** switch the stack to use that file.
- Ensure the stack’s **Re-pull image** (or “Pull latest image”) option is enabled so each redeploy pulls the latest tag from the registry.

- **Image name:** `ghcr.io/<GitHub-owner>/<repo-name>:latest` (e.g. `ghcr.io/couga/Dice-game:latest`). Set stack env var `DICE_GAME_IMAGE` to this (or edit `docker-compose.registry.yml` default).
- **First time:** In GitHub, go to the repo → **Packages** → open the new package → **Package settings** → set visibility to **Public** if the server cannot log in to GHCR. Or add GHCR credentials in Portainer (Registries) for private images.
- See `.github/workflows/docker-publish.yml` for the workflow; it runs on push to `update-to-vue` (edit the `branches` list if needed).

## Notes

- `package-lock.json` must be committed so `npm ci` works in the image.
- Position reference images: ensure `Position References` (root) or `public/Position References` is in the repo so admin images load; the build script copies root → public when present.
- Large assets (e.g. `public/models/`, `public/music/`) are included in the image; consider Git LFS or external storage if the image size is an issue.
