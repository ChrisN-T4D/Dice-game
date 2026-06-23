/**
 * Render a full guided session to a single WAV using the app's real Kokoro voice.
 *
 * Mirrors how the app does it: Kokoro synthesizes each spoken line of the plan,
 * and the lines are sequenced with the pauses between them. Long activity pauses
 * are compressed (capped) so the recording is listenable in a few minutes; pass
 * --real-time to keep true pause lengths.
 *
 * Usage:
 *   node scripts/record-session-kokoro.mjs [--voice af_nicole] [--real-time] [--out session-a-kokoro.wav]
 */
import { register } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
register('./_alias-loader.mjs', import.meta.url)

import { ensureKokoroVoicesForLocal, MODEL_ID } from './runKokoroStaticWavs.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')

// ---- args -------------------------------------------------------------------
const args = process.argv.slice(2)
let VOICE = 'af_nicole'
let REAL_TIME = false
let OUT = 'session-a-kokoro.wav'
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--voice' && args[i + 1]) VOICE = args[++i]
  else if (args[i] === '--real-time') REAL_TIME = true
  else if (args[i] === '--out' && args[i + 1]) OUT = args[++i]
}

// ---- build Session A plan (same config + seed as the preview) ---------------
const { buildSessionPlan } = await import('@/utils/sessionPlanBuilder')
const cfg = {
  totalMinutes: 60,
  turnMinutes: 3,
  pauseSeconds: 15,
  clothingRemovalSeconds: 30,
  phasePercents: [45, 30, 25],
  clothingEnabled: true,
  clothingListP1: ['Watch', 'Shirt', 'Pants', 'Underwear'],
  clothingListP2: ['Watch', 'Dress', 'Bra', 'Panties'],
  clothingRemovalMode: 'partner',
  distributionMode: 'phase1',
  intensityCurve: 'slow',
  partnerNames: { 1: 'Partner 1', 2: 'Partner 2' },
  partnerAnatomy: { 1: 'penis', 2: 'vulva' },
  vibratorsPresent: true,
  positionIntensity: 'more_physical',
  phase3PositionMode: 'each_turn',
  phase3MaxPositions: 4,
}
const plan = buildSessionPlan(cfg, 9000)
const turns = plan.turns || []
const turnSec = cfg.turnMinutes * 60

// ---- ordered speak/pause events ---------------------------------------------
const events = []
const speak = (t) => t && events.push({ speak: String(t) })
const pause = (sec) => sec > 0 && events.push({ pause: sec })
speak(plan.script[0])
pause(15)
for (const t of turns) {
  const ps = t.phraseStrings || []
  const clo = t.clothing ? Math.max(20, t.durationSec - turnSec) : 0
  let i = 0
  if (ps[i] != null) { speak(ps[i]); i++; pause(2) }
  if (t.clothing && ps[i] != null) { speak(ps[i]); i++; pause(clo) }
  if (ps[i] != null) { speak(ps[i]); i++ }
  if (ps[i] != null) { speak(ps[i]); i++; pause(15) }
  if (ps[i] != null) { speak(ps[i]); i++ }
  pause(turnSec)
}
const phraseCount = turns.reduce((n, t) => n + (t.phraseStrings ? t.phraseStrings.length : 0), 0)
plan.script.slice(1 + phraseCount).forEach(speak)

const pauseSec = (sec) => (REAL_TIME ? sec : Math.min(3, Math.max(0.5, sec)))
const spokenCount = events.filter((e) => e.speak != null).length
console.log(`Session A: ${spokenCount} spoken lines, ${events.length} events, voice=${VOICE}, ${REAL_TIME ? 'real-time' : 'compressed'} pauses`)

// ---- load Kokoro (local model) ----------------------------------------------
await ensureKokoroVoicesForLocal(projectRoot)
const { env } = await import('@huggingface/transformers')
env.allowLocalModels = true
env.allowRemoteModels = false
env.localModelPath = path.join(projectRoot, 'public', 'models') + path.sep
console.log('Loading Kokoro model (CPU q8)...')
const { KokoroTTS } = await import('kokoro-js')
const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: 'q8', device: 'cpu' })
console.log('Model loaded. Synthesizing...')

// ---- synthesize each line, stitch with silence for pauses -------------------
let SR = 24000
/** @type {Float32Array[]} */
const parts = []
let n = 0
for (const e of events) {
  if (e.speak != null) {
    n++
    const audio = await tts.generate(e.speak, { voice: VOICE })
    SR = audio.sampling_rate || SR
    const samples = audio.audio instanceof Float32Array ? audio.audio : new Float32Array(audio.audio)
    parts.push(samples)
    // brief breath after each spoken line
    parts.push(new Float32Array(Math.round(0.25 * SR)))
    if (n % 5 === 0 || n === spokenCount) console.log(`  [${n}/${spokenCount}] lines synthesized`)
  } else {
    parts.push(new Float32Array(Math.round(pauseSec(e.pause) * SR)))
  }
}

const total = parts.reduce((s, p) => s + p.length, 0)
const all = new Float32Array(total)
let off = 0
for (const p of parts) { all.set(p, off); off += p.length }

// ---- write 16-bit PCM mono WAV ----------------------------------------------
function writeWav(file, samples, sr) {
  const data = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]))
    data.writeInt16LE(Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), i * 2)
  }
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8)
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
  h.write('data', 36); h.writeUInt32LE(data.length, 40)
  fs.writeFileSync(file, Buffer.concat([h, data]))
}

writeWav(OUT, all, SR)
const durSec = Math.round(all.length / SR)
const mm = String(Math.floor(durSec / 60)).padStart(2, '0')
const ss = String(durSec % 60).padStart(2, '0')
console.log(`[written] ${OUT}  (${mm}:${ss}, ${SR} Hz)`)
