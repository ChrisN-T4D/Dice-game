/**
 * Load voice .bin file and reshape to [chunks][1][256] for Kokoro ONNX.
 * Uses cached fetch so voice files persist and are not re-downloaded every load.
 */
import { cachedFetch } from './cachedFetch.js'

/**
 * @param {string} baseUrl - e.g. /models/Kokoro-82M-v1.0-ONNX
 * @param {string} voiceId - e.g. af_nicole
 * @returns {Promise<number[][][]>}
 */
export async function loadShapedVoice(baseUrl, voiceId) {
  const url = `${baseUrl}/voices/${voiceId}.bin`
  const res = await cachedFetch(url)
  if (!res.ok) throw new Error(`Voice file not found: ${voiceId}`)
  const buf = await res.arrayBuffer()
  const arr = new Float32Array(buf)
  const reshaped = []
  for (let from = 0; from < arr.length; from += 256) {
    const to = Math.min(from + 256, arr.length)
    const chunk = Array.from(arr.slice(from, to))
    reshaped.push([chunk])
  }
  return reshaped
}
