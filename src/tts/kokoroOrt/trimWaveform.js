/**
 * Trim leading/trailing silence from waveform. From kokoro-web.
 * @param {Float32Array} waveform
 * @returns {Float32Array}
 */
export function trimWaveform(waveform) {
  const windowSize = 256
  const bufferSamples = 256
  const numWindows = Math.ceil(waveform.length / windowSize)
  const windowAmplitudes = new Float32Array(numWindows)
  let maxWindowAmp = 0

  for (let i = 0; i < numWindows; i++) {
    const start = i * windowSize
    const end = Math.min(start + windowSize, waveform.length)
    let sum = 0
    for (let j = start; j < end; j++) sum += Math.abs(waveform[j])
    const avg = sum / (end - start)
    windowAmplitudes[i] = avg
    if (avg > maxWindowAmp) maxWindowAmp = avg
  }

  const threshold = maxWindowAmp * 0.05

  let startSample = 0
  for (let i = 0; i < numWindows; i++) {
    if (windowAmplitudes[i] > threshold) {
      const winStart = i * windowSize
      const winEnd = Math.min(winStart + windowSize, waveform.length)
      for (let j = winStart; j < winEnd; j++) {
        if (Math.abs(waveform[j]) > threshold) {
          startSample = j
          break
        }
      }
      break
    }
  }

  let endSample = waveform.length
  for (let i = numWindows - 1; i >= 0; i--) {
    if (windowAmplitudes[i] > threshold) {
      const winStart = i * windowSize
      const winEnd = Math.min(winStart + windowSize, waveform.length)
      for (let j = winEnd - 1; j >= winStart; j--) {
        if (Math.abs(waveform[j]) > threshold) {
          endSample = j + 1
          break
        }
      }
      break
    }
  }

  startSample = Math.max(0, startSample - bufferSamples)
  endSample = Math.min(waveform.length, endSample + bufferSamples)
  return waveform.slice(startSample, endSample)
}
