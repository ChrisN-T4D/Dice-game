# TTS pipeline: writing → compiling → writing (dev reference)

This doc traces the flow from **text** to **playback** for the in-browser Kokoro TTS (ORT-only, Safari-compatible).

---

## High-level flow

```
[App/UI]  speak(text) / preparePhrase(text) / generateSessionAudio(text)
       →  useSpeech.js  (main thread)
       →  getTtsWorker().postMessage({ type: 'generate', id, text, voiceId })
       →
[TTS Worker]  tts.worker.js
       →  ensureKokoroLoaded()  →  loadKokoroOrt()  (ONNX session + model)
       →  runKokoro(text, voiceId)
       →  kokoroOrt/index.js  generate(text, { voice, lang, baseUrl })
            │
            ├─ 1. Load/cache ONNX session  (getOnnxRuntime, fetch model_quantized.onnx)
            ├─ 2. Load/cache voice         (voiceLoader: fetch voices/{voiceId}.bin → shaped [n][1][256])
            ├─ 3. Preprocess text         (textProcessor)
            │      ├─ sanitize
            │      ├─ phonemize(text, lang)  →  IPA string   (phonemize.js, espeak-ng WASM)
            │      ├─ tokenize(IPA)         →  token IDs   (tokenizer.js, vocab)
            │      └─ chunk by 510 tokens   →  chunks[]
            ├─ 4. For each chunk: run ONNX
            │      input_ids (int64), style (float32 from voice), speed (1.0)
            │      →  session.run()  →  waveform (Float32Array)
            │      →  trimWaveform(waveform)
            ├─ 5. Concat all trimmed waveforms
            └─ 6. createWavBuffer(waveform, 24000)  →  ArrayBuffer (RIFF WAV)
            →  new Blob([wavBuffer], { type: 'audio/wav' })
       →
       →  self.postMessage({ type: 'blob', id, blob })
       →
[useSpeech.js]  onmessage
       →  playBlob(blob)  (URL.createObjectURL → Audio → play)  or  resolve promise / call onReady
```

---

## Where each step lives

| Step | What | File(s) |
|------|------|--------|
| **Request** | UI calls `speak(text)` or `preparePhrase(text)` | `useSpeech.js` (composable) |
| **Worker entry** | `postMessage({ type: 'generate', id, text, voiceId })` | `useSpeech.js` |
| **Worker receive** | Queue + `processOne` → `runKokoro(text, voiceId)` | `src/workers/tts.worker.js` |
| **Load model** | Fetch ONNX, create InferenceSession (WebGPU or WASM) | `tts/kokoroOrt/index.js` (loadKokoroOrt), `getOnnxRuntime.js` |
| **Load voice** | Fetch `voices/{voiceId}.bin`, reshape to `[n][1][256]` | `tts/kokoroOrt/voiceLoader.js` |
| **Text → IPA** | Phonemize (espeak-ng WASM, `--ipa`) | `tts/kokoroOrt/phonemize.js` |
| **IPA → tokens** | Character → token ID via vocab | `tts/kokoroOrt/tokenizer.js` |
| **Chunk** | Split into chunks of ≤510 tokens | `tts/kokoroOrt/textProcessor.js` (preprocessText) |
| **ONNX run** | `input_ids`, `style`, `speed` → model → waveform | `tts/kokoroOrt/index.js` (generate loop) |
| **Trim** | Remove leading/trailing silence | `tts/kokoroOrt/trimWaveform.js` |
| **Waveform → WAV** | Float32 mono 24kHz → RIFF header + PCM | `tts/kokoroOrt/createWavBuffer.js` |
| **Return** | `postMessage({ type: 'blob', id, blob })` | `tts.worker.js` |
| **Play** | `URL.createObjectURL(blob)` → `<audio>.play()` | `useSpeech.js` (playBlob) |

---

## Data shapes (for debugging)

- **Voice (shaped):** `[n][1][256]` — n slices of 256-dim style vector.
- **Chunk tokens:** `[0, ...tokenIds..., 0]` (padded), length ≤ 512.
- **ONNX inputs:**  
  - `input_ids`: int64 `[1, seqLen]`  
  - `style`: float32 `[1, 256]` (one slice from voice)  
  - `speed`: float32 `[1]` (e.g. 1.0)
- **ONNX output:** one tensor → Float32Array (waveform).
- **WAV:** 44-byte header + float32 PCM, 24 000 Hz, mono.

---

## Warmup

- **Message:** `{ type: 'warmup' }` → worker runs `ensureKokoroLoaded()` (model + ONNX session).
- **Response:** `{ type: 'ready' }` or `{ type: 'error', message }`.
- **useSpeech:** `warmupWorker()` sends warmup; `kokoroReady` is set when `ready` is received.

---

## Quick reference: main → worker → ORT

1. **Main:** `speak(text)` / `preparePhrase(text)` → `getTtsWorker().postMessage({ type: 'generate', id, text, voiceId })`.
2. **Worker:** `runKokoro(text, voiceId)` → `generate(text, { voice })` in `kokoroOrt/index.js`.
3. **ORT pipeline:** preprocessText (sanitize → phonemize → tokenize → chunk) → for each chunk run ONNX → trim → concat → createWavBuffer → Blob.
4. **Worker:** `postMessage({ type: 'blob', id, blob })`.
5. **Main:** onmessage → `playBlob(blob)` or resolve/callback.
