/**
 * Create WAV ArrayBuffer from Float32 mono waveform (24kHz).
 * Uses 16-bit PCM (format 1) for broad HTML5 Audio compatibility; 32-bit float
 * is not reliably supported by all browsers for <audio> playback.
 */
const SAMPLE_RATE = 24000

/**
 * @param {Float32Array} waveform - samples in [-1, 1]
 * @param {number} sampleRate
 * @returns {ArrayBuffer}
 */
export function createWavBuffer(waveform, sampleRate = SAMPLE_RATE) {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const dataSize = waveform.length * (bitsPerSample / 8)
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  let offset = 0

  function writeStr(s) {
    for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i))
  }
  function writeU32(v) {
    view.setUint32(offset, v, true)
    offset += 4
  }
  function writeU16(v) {
    view.setUint16(offset, v, true)
    offset += 2
  }

  writeStr('RIFF')
  writeU32(36 + dataSize)
  writeStr('WAVE')
  writeStr('fmt ')
  writeU32(16)
  writeU16(1) // PCM
  writeU16(numChannels)
  writeU32(sampleRate)
  writeU32(byteRate)
  writeU16(numChannels * (bitsPerSample / 8))
  writeU16(bitsPerSample)
  writeStr('data')
  writeU32(dataSize)

  for (let i = 0; i < waveform.length; i++) {
    const s = Math.max(-1, Math.min(1, waveform[i]))
    const int16 = s < 0 ? s * 0x8000 : s * 0x7FFF
    view.setInt16(offset, int16, true)
    offset += 2
  }
  return buffer
}
