'use strict';

// =============================================
//  Text-to-Speech Module  (Web Speech API)
// =============================================

let voiceEnabled = false;
let voiceRate = 1.0;

// Restore preference from localStorage
(function initVoice() {
  const saved = localStorage.getItem('voiceEnabled');
  if (saved === 'true') voiceEnabled = true;
})();

function isSpeechSupported() {
  return 'speechSynthesis' in window;
}

/**
 * Strip emoji, arrows, shorthand so the synth reads natural English.
 */
function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    // Wide unicode emoji ranges
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    // Specific symbols used in the app
    .replace(/[⭐✓🔊🌶️]/g, '')
    .replace(/→/g, 'to')
    .replace(/\+/g, 'plus ')
    .replace(/P(\d)/g, 'Partner $1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pick the best available English voice.
 */
function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Preference order: Google English > any local English > first English
  return voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
      || voices.find(v => v.lang.startsWith('en') && v.localService)
      || voices.find(v => v.lang.startsWith('en'))
      || null;
}

/**
 * Speak arbitrary text (cancels anything currently being read).
 */
function speakText(text) {
  if (!voiceEnabled || !isSpeechSupported()) return;

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate   = voiceRate;
  utterance.pitch  = 1.0;
  utterance.volume = 1.0;

  const voice = pickVoice();
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Read the current Where / What / Clothing output as a single announcement.
 */
function speakInstructions() {
  if (!voiceEnabled || !isSpeechSupported()) return;

  const where    = document.getElementById('whereOutput')?.textContent || '';
  const what     = document.getElementById('whatOutput')?.textContent || '';
  const clothing = document.getElementById('clothingOutput')?.textContent || '';

  let parts = [];

  if (where && where !== '—') parts.push(where);
  if (what && what !== '—')   parts.push(what);
  if (clothing && clothing.trim()) parts.push('Clothing: ' + clothing);

  if (parts.length) speakText(parts.join('. ') + '.');
}

/**
 * Toggle voice on / off, persist to localStorage, update every toggle button.
 */
function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  localStorage.setItem('voiceEnabled', voiceEnabled ? 'true' : 'false');
  updateVoiceButtons();

  if (voiceEnabled) {
    speakText('Voice enabled');
  } else {
    stopSpeaking();
  }
}

function updateVoiceButtons() {
  document.querySelectorAll('.voice-toggle-btn').forEach(btn => {
    if (voiceEnabled) {
      btn.textContent = '\u{1F50A} Voice On';
      btn.classList.add('voice-on');
    } else {
      btn.textContent = '\u{1F507} Voice Off';
      btn.classList.remove('voice-on');
    }
  });
}

// Chrome loads voices asynchronously — update buttons once voices arrive
if (isSpeechSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices(); // prime the cache
  };
}
