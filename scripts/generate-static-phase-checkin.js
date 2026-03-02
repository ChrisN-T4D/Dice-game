#!/usr/bin/env node
/**
 * Generate static WAVs for phase-check-in phrases: 9 phrases.
 * Output: public/audio/static/<voiceId>/phase_checkin_1..9.wav
 * Requires local Kokoro model. Use --gpu for GPU.
 */
import { PHASE_CHECKIN_PHRASES } from './staticPhraseData.js'
import { runStaticWavGeneration } from './runKokoroStaticWavs.js'

const useGpu = process.argv.includes('--gpu')
runStaticWavGeneration({
  phrases: PHASE_CHECKIN_PHRASES,
  useGpu,
  groupName: 'phase_checkin',
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
