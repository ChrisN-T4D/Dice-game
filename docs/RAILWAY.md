# Deploy on Railway

This app is a static Vue build served by **nginx** in [Dockerfile](../Dockerfile). No database is required. State stays in the browser (localStorage).

**Voice (Kokoro)** runs entirely in the browser (Web Worker + WASM). There is **no separate HTTP TTS service** in this project.

## Web app service

1. **New project** → **Deploy from GitHub** (or empty service → connect repo).
2. Railway usually detects the root **Dockerfile**. If not, set the builder to **Dockerfile** at repo root.
3. **Networking**: Railway sets **`PORT`** at runtime. The container listens on that port (default **80** when `PORT` is unset, e.g. local Docker).

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Set by Railway. Do not override unless you know what you are doing. |
| `AUDIO_ASSETS_URL` | No | Direct URL to `audio-assets.tar.gz` from `npm run pack-audio-assets`. On first start the entrypoint downloads and extracts into `/usr/share/nginx/html/audio/`. |
| `AUDIO_ASSETS_SHA256` | No | Optional SHA-256 checksum for `AUDIO_ASSETS_URL`. If set and mismatched, extraction is skipped. |

### Security notes

- **Admin password** (Admin screen) is stored in the browser (`localStorage`) in **plaintext**. It is only casual protection on a shared device; do not treat it as a high-assurance secret.
- **Content-Security-Policy** is enforced by **nginx** in the Docker image ([nginx.conf.template](../nginx.conf.template)). Local `vite` dev does not use that file.
- **Git / CI**: Never commit `.env`, keys, or `audio-assets.tar.gz` (see [.gitignore](../.gitignore)). This repo can run **gitleaks** in CI (see [`.github/workflows/gitleaks.yml`](../.github/workflows/gitleaks.yml)).
- **`npm audit`**: Run regularly on the repo.

### Static phrase audio

**Default:** If **`public/audio/static/...`** is present when **`npm run build`** runs (committed in the repo and not excluded from the Docker build context), the nginx image serves **`/audio/static/...`** and the app uses those WAVs (see **`getStaticAudioUrl`** in `src/composables/useSpeech.js`).

**Optional tarball:** To avoid large binaries in git or to refresh assets without rebuilding:

1. Locally: `npm run pack-audio-assets`
2. Upload `audio-assets.tar.gz` (e.g. GitHub Release asset or any HTTPS URL).
3. Set **`AUDIO_ASSETS_URL`** to that URL and redeploy.

If the container already created `audio/.downloaded`, change the URL or clear the service volume so a fresh download runs (same behavior as Portainer).

## Local Docker (unchanged behavior)

```bash
docker build -t dice-game:latest .
docker run -p 3000:80 dice-game:latest
```

Opens on **http://localhost:3000** (nginx listens on **80** inside the container when `PORT` is unset).

## Reference

- Entrypoint: [entrypoint.sh](../entrypoint.sh) (PORT, optional audio download)
- Nginx template: [nginx.conf.template](../nginx.conf.template)
