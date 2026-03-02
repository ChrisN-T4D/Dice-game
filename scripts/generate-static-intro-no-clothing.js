#!/usr/bin/env node
/**
 * Generate static WAVs for intro (no clothing): 9 phrases.
 * Output: public/audio/static/<voiceId>/intro_no_clothing_1..9.wav
 * Requires local Kokoro model. Use --gpu for GPU.
 */
import { INTRO_NO_CLOTHING } from './staticPhraseData.js'
import { runStaticWavGeneration } from './runKokoroStaticWavs.js'

const useGpu = process.argv.includes('--gpu')
runStaticWavGeneration({
  phrases: INTRO_NO_CLOTHING,
  useGpu,
  groupName: 'intro_no_clothing',
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
