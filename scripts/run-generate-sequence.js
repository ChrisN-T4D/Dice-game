#!/usr/bin/env node
/**
 * Runs all generate scripts in sequence. Each script starts only after
 * the previous one has completed successfully. Skips a script if its
 * output is already present in public/audio (checks a signature .wav file).
 */

import { execSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const audioStaticRoot = path.join(projectRoot, 'public', 'audio', 'static');

/**
 * One signature file per script: if this file exists, we consider the script already run.
 * Paths are relative to public/audio/static (e.g. "af_nicole/intro_no_clothing_1.wav").
 * Chosen so only that script produces this file (or we use a voice only that script uses).
 */
const SIGNATURE_FILE_BY_SCRIPT = {
  'generate-static-wavs': 'af_nicole/session_complete_1.wav',
  'generate-voice-test-wavs': 'bf_alice/voice_test.wav',
  'generate-static-intro-no-clothing': 'af_nicole/intro_no_clothing_1.wav',
  'generate-static-intro-with-clothing': 'af_nicole/intro_with_clothing_1.wav',
  'generate-static-next-turn': 'af_nicole/next_turn_1.wav',
  'generate-static-turn-begins': 'af_nicole/turn_begins_1.wav',
  'generate-static-ease-in': 'af_nicole/ease_in_1.wav',
  'generate-static-session-complete': 'bf_alice/session_complete_1.wav',
  'generate-static-settle-into-position': 'af_nicole/settle_into_position_1.wav',
  'generate-static-phase-checkin': 'af_nicole/phase_checkin_1.wav',
};

const GENERATE_SCRIPTS = [
  'generate-static-wavs',
  'generate-voice-test-wavs',
  'generate-static-intro-no-clothing',
  'generate-static-intro-with-clothing',
  'generate-static-next-turn',
  'generate-static-turn-begins',
  'generate-static-ease-in',
  'generate-static-session-complete',
  'generate-static-settle-into-position',
  'generate-static-phase-checkin',
];

function alreadyRun(scriptName) {
  const rel = SIGNATURE_FILE_BY_SCRIPT[scriptName];
  if (!rel) return false;
  const fullPath = path.join(audioStaticRoot, rel);
  return fs.existsSync(fullPath);
}

function main() {
  const total = GENERATE_SCRIPTS.length;
  console.log(`Running ${total} generate scripts in sequence (skipping if output already in public/audio).\n`);

  for (let i = 0; i < total; i++) {
    const name = GENERATE_SCRIPTS[i];
    if (alreadyRun(name)) {
      console.log(`[${i + 1}/${total}] ${name} — skipped (output already present)\n`);
      continue;
    }
    console.log(`[${i + 1}/${total}] npm run ${name}`);
    try {
      execSync(`npm run ${name}`, {
        stdio: 'inherit',
        shell: true,
      });
    } catch (err) {
      console.error(`\nSequence stopped: "${name}" failed (exit code ${err.status ?? 1}).`);
      process.exit(err.status ?? 1);
    }
    console.log('');
  }

  console.log(`All ${total} generate scripts completed (some may have been skipped).`);
}

main();
