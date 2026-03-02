#!/usr/bin/env node
/**
 * Generate static WAVs for session-complete phrases: 3 phrases.
 * Output: public/audio/static/<voiceId>/session_complete_1..3.wav
 * Requires local Kokoro model. Use --gpu for GPU.
 */
import { SESSION_COMPLETE_PHRASES } from './staticPhraseData.js'
import { runStaticWavGeneration } from './runKokoroStaticWavs.js'

const useGpu = process.argv.includes('--gpu')
runStaticWavGeneration({
  phrases: SESSION_COMPLETE_PHRASES,
  useGpu,
  groupName: 'session_complete',
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
