#!/usr/bin/env node
/**
 * Generate static WAVs for settle-into-position: 1 phrase.
 * Output: public/audio/static/<voiceId>/settle_into_position_1.wav
 * Requires local Kokoro model. Use --gpu for GPU.
 */
import { SETTLE_INTO_POSITION } from './staticPhraseData.js'
import { runStaticWavGeneration } from './runKokoroStaticWavs.js'

const useGpu = process.argv.includes('--gpu')
runStaticWavGeneration({
  phrases: SETTLE_INTO_POSITION,
  useGpu,
  groupName: 'settle_into_position',
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
