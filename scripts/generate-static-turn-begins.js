#!/usr/bin/env node
/**
 * Generate static WAVs for turn-begins phrases: 4 phrases.
 * Output: public/audio/static/<voiceId>/turn_begins_1..4.wav
 * Requires local Kokoro model. Use --gpu for GPU.
 */
import { TURN_BEGINS_PHRASES } from './staticPhraseData.js'
import { runStaticWavGeneration } from './runKokoroStaticWavs.js'

const useGpu = process.argv.includes('--gpu')
runStaticWavGeneration({
  phrases: TURN_BEGINS_PHRASES,
  useGpu,
  groupName: 'turn_begins',
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
