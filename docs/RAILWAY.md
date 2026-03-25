# Deploy on Railway

This app is a static Vue build served by **nginx** in [Dockerfile](../Dockerfile). No database is required. State stays in the browser (localStorage).

## Web app service

1. **New project** → **Deploy from GitHub** (or empty service → connect repo).
2. Railway usually detects the root **Dockerfile**. If not, set the builder to **Dockerfile** at repo root.
3. **Networking**: Railway sets **`PORT`** at runtime. The container listens on that port (default **80** when `PORT` is unset, e.g. local Docker).

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Set by Railway. Do not override unless you know what you are doing. |
| `TTS_SERVER_URL` | No | Full URL of optional TTS service (e.g. `https://your-tts-service.up.railway.app`). Written to `/config.json` as `ttsServerUrl`. Overrides `HOST` if both are set. |
| `HOST` | No | Legacy Traefik-style hostname. If set and `TTS_SERVER_URL` is empty, `config.json` gets `https://tts.<HOST>`. |
| `AUDIO_ASSETS_URL` | No | Direct URL to `audio-assets.tar.gz` from `npm run pack-audio-assets`. On first start the entrypoint downloads and extracts into `/usr/share/nginx/html/audio/`. |

### Static phrase audio

1. Locally: `npm run pack-audio-assets`
2. Upload `audio-assets.tar.gz` (e.g. GitHub Release asset or any HTTPS URL).
3. Set **`AUDIO_ASSETS_URL`** to that URL and redeploy.

If the container already created `audio/.downloaded`, change the URL or clear the service volume so a fresh download runs (same behavior as Portainer).

## Optional: TTS server (second service)

For clients that cannot run Kokoro in-browser (e.g. some iOS setups), run **[Dockerfile.tts](../Dockerfile.tts)** as a **second** Railway service from the same repo:

1. Add service → same repo → set **Dockerfile path** to `Dockerfile.tts` (Railway UI: Dockerfile or root directory settings per service).
2. Deploy and copy the **public HTTPS URL** of that service.
3. On the **web** service, set **`TTS_SERVER_URL`** to that URL (no trailing slash required).

The web app loads `ttsServerUrl` from `/config.json` ([useSpeech.js](../src/composables/useSpeech.js)).

## Local Docker (unchanged behavior)

```bash
docker build -t dice-game:latest .
docker run -p 3000:80 dice-game:latest
```

Opens on **http://localhost:3000** (nginx listens on **80** inside the container when `PORT` is unset).

## Reference

- Entrypoint: [entrypoint.sh](../entrypoint.sh) (PORT, `config.json`, optional audio download)
- Nginx template: [nginx.conf.template](../nginx.conf.template)
