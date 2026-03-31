# Portainer: URL setup walkthrough

This guide explains **what URLs the app uses** and **exactly how to set them** in Portainer so they work.

---

## 1. Audio assets URL (static WAVs)

The Docker image does **not** include the ~1700 static WAV files. At container **start**, the entrypoint can download them from a URL you provide so nginx can serve `/audio/static/...`.

### Step 1: You already have the tarball

- **File:** `audio-assets.tar.gz` (in the repo root, ~1.7 GB).  
- It was created by `npm run pack-audio-assets`. To recreate it later: run that command (requires `public/audio` and Node).

### Step 2: Host the file somewhere the container can download it

The container runs `wget -O /tmp/audio-assets.tar.gz "$AUDIO_ASSETS_URL"`. The URL must be:

- **HTTPS** (or HTTP).
- **Direct download**: the request must return the file itself, not an HTML page (e.g. “sign in” or “click to download”).

**Option A – GitHub Release**

You can use either of these:

- **Preferred (smaller download):** Create a tarball with `npm run pack-audio-assets` (top-level `audio/` only). Draft a release, **attach** that file as a release asset, then copy the **asset** URL (e.g. `https://github.com/.../releases/download/audio-assets/audio-assets.tar.gz`).  
- **Source-code archive:** You can use the **“Source code (tar.gz)”** link from a release (e.g. right‑click → Copy link address). That URL looks like `https://github.com/.../archive/refs/tags/audio-assets.tar.gz` and contains the full repo. The entrypoint detects this format and uses `<repo-dir>/public/audio` so it still works. The download is larger than the packed-audio-only tarball.

**Option B – S3 / R2 / your server**

- Upload `audio-assets.tar.gz` to a bucket or server.
- Set the object to **public read** (or use a signed URL if your entrypoint can use it).
- The URL must be the **direct** file URL (e.g. `https://bucket.s3.region.amazonaws.com/audio-assets.tar.gz`).

### Step 3: Set the URL in Portainer

1. Open your stack (e.g. **Stacks** → your Dice game stack).
2. **Editor** (or **Add stack** / **Web editor**): in the **Environment variables** section for the **app** service, add:
   - **Name:** `AUDIO_ASSETS_URL`
   - **Value:** the exact URL you copied (e.g. the GitHub release asset URL).
3. **Redeploy** the stack (or **Update the stack** and deploy).

The **first** time the app container starts with `AUDIO_ASSETS_URL` set, the entrypoint will:

- Download the tarball.
- Extract it under `/usr/share/nginx/html` so `/audio/static/...` is served.
- Create a marker so it **does not** re-download on the next restart.

If the URL is wrong (e.g. 404, or an HTML page), the container log will show:  
`Warning: failed to download audio assets from AUDIO_ASSETS_URL`.  
Fix the URL and redeploy; you can remove the container (or the volume if you use one) so it tries again.

**Optional – persist audio across restarts**

- Add a volume for the app’s document root (e.g. map a Portainer volume to `/usr/share/nginx/html` or to `/usr/share/nginx/html/audio`).  
- Then the downloaded audio stays on the host and isn’t re-downloaded when the container is recreated.

---

## 2. Voice / Kokoro (no separate TTS service)

Guided and free-play voice use **Kokoro inside the browser** (Web Worker + WASM) and optionally **pre-generated static WAVs** under `/audio/static/...`. There is **no** HTTP TTS container or `/config.json` URL for a remote TTS service. If Kokoro fails on a device, users can switch to **Browser** voices in Preferences (☰ → Voice).

**Summary**

| Goal                         | What to set in Portainer                          |
|-----------------------------|----------------------------------------------------|
| App reachable at a hostname | Set **`HOST`** (e.g. `app.example.com`) for Traefik. |
| Static WAVs in the app      | Set **`AUDIO_ASSETS_URL`** to the tarball URL.     |

---

## Quick checklist

- [ ] **Audio:** `audio-assets.tar.gz` is uploaded and the **direct** download URL is copied.
- [ ] **Portainer – app service:** Environment variable **`AUDIO_ASSETS_URL`** = that URL. Redeploy.
- [ ] **Optional:** **`HOST`** set if you need Traefik routing / custom domain.
- [ ] After deploy, check container logs for “Downloading audio assets…” and “Audio assets ready.” (or “Warning: failed to download…” if the URL is wrong).
