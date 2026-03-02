#!/usr/bin/env node
/**
 * Generate static WAVs for next-turn phrases: 4 phrases.
 * Output: public/audio/static/<voiceId>/next_turn_1..4.wav
 * Requires local Kokoro model. Use --gpu for GPU.
 */
import { NEXT_TURN_PHRASES } from './staticPhraseData.js'
import { runStaticWavGeneration } from './runKokoroStaticWavs.js'

const useGpu = process.argv.includes('--gpu')
runStaticWavGeneration({
  phrases: NEXT_TURN_PHRASES,
  useGpu,
  groupName: 'next_turn',
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
