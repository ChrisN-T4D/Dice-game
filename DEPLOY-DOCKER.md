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

## Notes

- `package-lock.json` must be committed so `npm ci` works in the image.
- Position reference images: ensure `Position References` (root) or `public/Position References` is in the repo so admin images load; the build script copies root → public when present.
- Large assets (e.g. `public/models/`, `public/music/`) are included in the image; consider Git LFS or external storage if the image size is an issue.
