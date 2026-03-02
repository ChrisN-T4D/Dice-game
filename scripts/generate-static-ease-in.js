#!/usr/bin/env node
/**
 * Generate static WAVs for ease-in phrases: 4 phrases.
 * Output: public/audio/static/<voiceId>/ease_in_1..4.wav
 * Requires local Kokoro model. Use --gpu for GPU.
 */
import { EASE_IN_PHRASES } from './staticPhraseData.js'
import { runStaticWavGeneration } from './runKokoroStaticWavs.js'

const useGpu = process.argv.includes('--gpu')
runStaticWavGeneration({
  phrases: EASE_IN_PHRASES,
  useGpu,
  groupName: 'ease_in',
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
