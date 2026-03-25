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

## 2. TTS server URL / config.json (why “setting the URL” didn’t work)

The app can use an optional **TTS server** for devices where in‑browser Kokoro doesn’t run (e.g. some iOS). The “server URL” the app uses comes from **`/config.json`**, which is **generated when the container starts**, not set by you directly.

### How config.json is built

- **Entrypoint** (`entrypoint.sh`) writes `/usr/share/nginx/html/config.json` when the container starts.
- **`TTS_SERVER_URL`** (optional) — if set, it wins and is written as `ttsServerUrl` as-is (full URL). Use this on platforms like **Railway** where TTS is a separate public URL, not `https://tts.<HOST>`.
- Else **`HOST`** (Traefik / subdomain style):
  - If **`HOST`** is set (e.g. `app.example.com`), it writes:  
    `{"ttsServerUrl":"https://tts.app.example.com"}`  
    So the TTS URL is **`https://tts.<HOST>`**.
  - If neither is set, it writes:  
    `{"ttsServerUrl":""}`  
    So the app does **not** use a TTS server.

So when you “set the URL for the server”, what actually matters is:

1. **`TTS_SERVER_URL`** on the app service (if you need a full URL), **or**
2. **`HOST`** in the stack plus Traefik routing `tts.<HOST>` to the TTS container.

### Why the TTS server was broken

The TTS container uses **Node** and loads **Kokoro** via `kokoro-js` and `@huggingface/transformers`, which in turn use **onnxruntime-node** (native ONNX bindings for Node).

- **onnxruntime-node** ships **prebuilt native binaries** compiled for **glibc** (standard Linux).
- The TTS Dockerfile used **`node:20-alpine`**. Alpine Linux uses **musl libc**, not glibc.
- On Alpine there is **no** `ld-linux-x86-64.so.2` (that’s the glibc dynamic linker). When Node tries to load the ONNX native addon, it looks for that linker and fails with an error like:  
  `Error loading shared library ld-linux-x86-64.so.2 … (needed by … onnxruntime-node …)`  
  So the **server process crashes at startup** before it can serve any request.

So: “setting the URL” **did** point the app at the server; the problem was the **TTS container** failing on Alpine, not the URL. The image has been updated to use a **glibc-based** base (see below) so the TTS server can run if you want it.

### Why it didn’t work before (summary)

- You set **`HOST`** (or expected a TTS URL). The entrypoint wrote `config.json` with `ttsServerUrl: "https://tts.<HOST>"`.
- The app **did** use that URL. But the **TTS container** was failing on Alpine (see above). So the **URL was correct**, but the **server** at that URL never came up. Requests from the app to the TTS server then failed (connection error or 502).

### What to do now (local‑first)

- The app is **local‑first**: it uses **in‑browser Kokoro** when available and does **not** need a TTS server for normal use.
- You can:
  - **Leave `HOST` unset**  
    → `config.json` has `ttsServerUrl: ""`  
    → No TTS server is used; everything runs in the browser where Kokoro works.
  - **Set `HOST` only for Traefik**  
    → Use `HOST` so Traefik routes your app at `https://<HOST>`. The entrypoint will still set `ttsServerUrl` to `https://tts.<HOST>`, but the app will only call it when in‑browser Kokoro isn’t available (e.g. some iOS). If you don’t run the TTS container or it’s still broken, those devices will get the “use Browser voices” message instead of a working server.

**Summary**

| Goal                         | What to set in Portainer                          |
|-----------------------------|----------------------------------------------------|
| App reachable at a hostname | Set **`HOST`** (e.g. `app.example.com`) for Traefik. |
| Static WAVs in the app      | Set **`AUDIO_ASSETS_URL`** to the tarball URL.     |
| TTS server used by the app  | Run the TTS stack and set **`HOST`**; app gets `https://tts.<HOST>` from config. Optional; not required for local-first use. |

---

## Quick checklist

- [ ] **Audio:** `audio-assets.tar.gz` is uploaded and the **direct** download URL is copied.
- [ ] **Portainer – app service:** Environment variable **`AUDIO_ASSETS_URL`** = that URL. Redeploy.
- [ ] **Optional:** **`HOST`** set only if you need Traefik routing; leave unset if you don’t care about TTS or custom domain.
- [ ] After deploy, check container logs for “Downloading audio assets…” and “Audio assets ready.” (or “Warning: failed to download…” if the URL is wrong).
