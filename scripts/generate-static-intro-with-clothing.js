#!/usr/bin/env node
/**
 * Generate static WAVs for intro (with clothing): 27 phrases (3×3×3).
 * Output: public/audio/static/<voiceId>/intro_with_clothing_1..27.wav
 * Requires local Kokoro model. Use --gpu for GPU.
 */
import { INTRO_WITH_CLOTHING } from './staticPhraseData.js'
import { runStaticWavGeneration } from './runKokoroStaticWavs.js'

const useGpu = process.argv.includes('--gpu')
runStaticWavGeneration({
  phrases: INTRO_WITH_CLOTHING,
  useGpu,
  groupName: 'intro_with_clothing',
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
