#!/usr/bin/env node
/**
 * Run the tokenize-path ONNX pipeline in Node: same token IDs as server,
 * same tensor construction as kokoroOrt, write WAV. Use to verify if
 * device ONNX produces correct audio when given server token IDs.
 *
 * Usage: node scripts/run-tokenize-path-onnx-node.js [phrase]
 * Output: tokenize-path-output.wav
 */
import { readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { phonemize } from 'phonemizer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const MODEL_ID = 'Kokoro-82M-v1.0-ONNX'
const modelDir = join(projectRoot, 'public', 'models', MODEL_ID)
const SAMPLE_RATE = 24000

function kokoroPostProcess(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .replace(/kəkˈoːɹoʊ/g, 'kˈoʊkəɹoʊ')
    .replace(/kəkˈɔːɹəʊ/g, 'kˈəʊkəɹəʊ')
    .replace(/ʲ/g, 'j')
    .replace(/r/g, 'ɹ')
    .replace(/x/g, 'k')
    .replace(/ɬ/g, 'l')
    .replace(/(?<=[a-zɹː])(?=hˈʌndɹɪd)/g, ' ')
    .replace(/ z(?=[;:,.!?¡¿—…"«»"" ]|$)/g, 'z')
    .replace(/(?<=nˈaɪn)ti(?!ː)/g, 'di')
    .trim()
}

async function main() {
  const phrase = process.argv[2] || 'Hello, this is a voice test.'
  console.log('Phrase:', phrase)

  const tokenizer = JSON.parse(await readFile(join(modelDir, 'tokenizer.json'), 'utf8'))
  const vocab = tokenizer.model.vocab
  const allowedChars = new Set(Object.keys(vocab).filter((k) => k !== '$'))

  const raw = await phonemize(phrase.trim(), 'en-us')
  const joined = Array.isArray(raw) ? raw.join(' ') : (raw || '')
  const ipa = kokoroPostProcess(joined.trim())
  const normalized = [...ipa].filter((c) => allowedChars.has(c)).join('')
  const tokenIds = normalized.split('').map((c) => vocab[c] ?? vocab['$'])
  console.log('Content token count:', tokenIds.length)

  const paddedTokens = [0, ...tokenIds, 0]
  const input_ids_data = new BigInt64Array(paddedTokens.length)
  for (let i = 0; i < paddedTokens.length; i++) input_ids_data[i] = BigInt(paddedTokens[i])

  const voicePath = join(modelDir, 'voices', 'af_nicole.bin')
  const voiceBuf = await readFile(voicePath)
  const voiceArr = new Float32Array(voiceBuf.buffer, voiceBuf.byteOffset, voiceBuf.byteLength / 4)
  const shapedVoice = []
  for (let from = 0; from < voiceArr.length; from += 256) {
    const to = Math.min(from + 256, voiceArr.length)
    shapedVoice.push([Array.from(voiceArr.slice(from, to))])
  }
  const refIndex = Math.min(tokenIds.length, shapedVoice.length - 1)
  const ref_s = shapedVoice[refIndex][0]

  const ort = await import('onnxruntime-web')
  const modelPath = join(modelDir, 'onnx', 'model_quantized.onnx')
  const modelBuf = await readFile(modelPath)
  const session = await ort.InferenceSession.create(
    modelBuf.buffer.slice(modelBuf.byteOffset, modelBuf.byteOffset + modelBuf.byteLength),
    { executionProviders: ['cpu'] }
  )

  const input_ids = new ort.Tensor('int64', input_ids_data, [1, paddedTokens.length])
  const style = new ort.Tensor('float32', new Float32Array(ref_s), [1, 256])
  const speed = new ort.Tensor('float32', new Float32Array([1]), [1])

  const result = await session.run({ input_ids, style, speed })
  const waveformTensor = result.waveform ?? result[Object.keys(result)[0]]
  let waveform = await waveformTensor.getData()
  if (!(waveform instanceof Float32Array)) waveform = new Float32Array(waveform)
  if (waveformTensor.dims?.length > 1) {
    const [, ...rest] = waveformTensor.dims
    const expectedLen = rest.reduce((a, b) => a * b, 1)
    if (waveform.length > expectedLen) waveform = waveform.subarray(0, expectedLen)
  }

  const { trimWaveform } = await import('../src/tts/kokoroOrt/trimWaveform.js')
  const { createWavBuffer } = await import('../src/tts/kokoroOrt/createWavBuffer.js')
  const trimmed = trimWaveform(waveform)
  const wavBuffer = createWavBuffer(trimmed, SAMPLE_RATE)
  const outPath = join(projectRoot, 'tokenize-path-output.wav')
  await writeFile(outPath, Buffer.from(wavBuffer))
  console.log('Wrote', outPath)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
