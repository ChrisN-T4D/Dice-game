'use strict';

// =============================================
//  Text-to-Speech Module  (Web Speech API)
// =============================================

let voiceEnabled = false;
let voiceRate = 1.0;
let selectedVoiceURI = ''; // empty = use default (pickVoice())

// Restore preference from localStorage
(function initVoice() {
  const saved = localStorage.getItem('voiceEnabled');
  if (saved === 'true') voiceEnabled = true;
  const uri = localStorage.getItem('selectedVoiceURI');
  if (uri) selectedVoiceURI = uri;
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
 * Pick the best available English voice (used when no voice is selected).
 * Default preference: Zira (Windows) > Google English > any local English > first English.
 */
function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  return voices.find(v => v.lang.startsWith('en') && /zira/i.test(v.name))
      || voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
      || voices.find(v => v.lang.startsWith('en') && v.localService)
      || voices.find(v => v.lang.startsWith('en'))
      || null;
}

/**
 * Get the voice to use: selected if set and found (by URI or by name on mobile), otherwise pickVoice().
 */
function getSelectedVoice() {
  if (selectedVoiceURI) {
    const voices = window.speechSynthesis.getVoices();
    let found = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (!found && selectedVoiceURI.startsWith('name:')) {
      const namePart = selectedVoiceURI.slice(5);
      found = voices.find(v => v.name === namePart);
    }
    if (found) return found;
  }
  return pickVoice();
}

/**
 * Set and persist the chosen voice (by voiceURI). Pass empty string to use default.
 */
function setSelectedVoice(voiceURI) {
  selectedVoiceURI = voiceURI || '';
  localStorage.setItem('selectedVoiceURI', selectedVoiceURI);
  syncVoiceSelects();
}

/**
 * Get list of voices (English first, then others). For populating a dropdown.
 */
function getVoicesList() {
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter(v => v.lang.startsWith('en'));
  const rest = voices.filter(v => !v.lang.startsWith('en'));
  return [...en, ...rest];
}

/**
 * Populate a <select> with voice options. Call on load and on voiceschanged.
 * @param {HTMLSelectElement} selectEl - The <select> to fill
 */
function populateVoiceSelect(selectEl) {
  if (!selectEl || !isSpeechSupported()) return;
  const voices = getVoicesList();
  const currentValue = selectEl.value || selectedVoiceURI;
  selectEl.innerHTML = '';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Default (Zira if available)';
  selectEl.appendChild(defaultOpt);
  voices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI || ('name:' + v.name);
    opt.textContent = v.name + (v.lang ? ` (${v.lang})` : '');
    if (v.default) opt.textContent += ' [system default]';
    selectEl.appendChild(opt);
  });
  if (currentValue) selectEl.value = currentValue;
  else if (selectedVoiceURI) selectEl.value = selectedVoiceURI;
}

/**
 * Sync all voice dropdowns to the current selection (call after setSelectedVoice or when populating).
 */
function syncVoiceSelects() {
  const value = selectedVoiceURI || '';
  document.querySelectorAll('.voice-select').forEach(sel => {
    if (sel.value !== value) sel.value = value;
  });
}

/**
 * Speak arbitrary text (cancels anything currently being read).
 * @param {string} text - Text to speak
 * @param {{ force?: boolean, onEnd?: function }} options - force: speak when voice off. onEnd: called when done (or immediately if nothing spoken).
 */
/** Restore background music volume after voice was reading (duck). Call on speech end or before starting new speech. */
function restoreBackgroundMusicAfterSpeech() {
  if (window.backgroundMusicElement && window._musicVolumeBeforeSpeech != null) {
    window.backgroundMusicElement.volume = window._musicVolumeBeforeSpeech;
    window._musicVolumeBeforeSpeech = null;
  }
}

/** Duck background music so instructions can be heard; speech.js restores volume when done. */
function duckBackgroundMusicForSpeech() {
  restoreBackgroundMusicAfterSpeech();
  if (window.backgroundMusicElement) {
    window._musicVolumeBeforeSpeech = window.backgroundMusicElement.volume;
    window.backgroundMusicElement.volume = Math.min(0.2, (window.backgroundMusicVolume || 0.5) * 0.3);
  }
}

function speakText(text, options) {
  const opts = options || {};
  const force = opts.force === true;
  const onEnd = typeof opts.onEnd === 'function' ? opts.onEnd : null;

  if (!force && !voiceEnabled) {
    if (onEnd) onEnd();
    return;
  }
  if (!isSpeechSupported()) {
    if (onEnd) onEnd();
    return;
  }

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) {
    if (onEnd) onEnd();
    return;
  }

  window.speechSynthesis.cancel();
  duckBackgroundMusicForSpeech();

  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate   = voiceRate;
  utterance.pitch  = 1.0;
  utterance.volume  = 1.0;

  const voice = getSelectedVoice();
  if (voice) utterance.voice = voice;

  const done = () => {
    restoreBackgroundMusicAfterSpeech();
    if (onEnd) onEnd();
  };
  utterance.onend = done;
  utterance.onerror = done;

  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
  restoreBackgroundMusicAfterSpeech();
}

/**
 * Build the full instruction text (optionally including the message, e.g. "Partner 1 giver to Partner 2 receiver").
 * @param {{ includeMessage?: boolean }} options - If includeMessage is true, prepend the message box text (for guided mode).
 * @returns {string} - Text to speak, or '' if nothing to say.
 */
function getInstructionsText(options) {
  const includeMessage = options && options.includeMessage === true;
  const message = document.getElementById('message')?.textContent?.trim() || '';
  const where    = document.getElementById('whereOutput')?.textContent || '';
  const what     = document.getElementById('whatOutput')?.textContent || '';
  const clothing = document.getElementById('clothingOutput')?.textContent || '';

  const parts = [];
  if (includeMessage && message && message !== '—') parts.push(message);
  if (where && where !== '—') parts.push('Where: ' + where);
  if (what && what !== '—') parts.push('How: ' + what);
  if (clothing && clothing.trim()) parts.push('Clothing: ' + clothing);

  return parts.length ? parts.join('. ') + '.' : '';
}

/**
 * Read the current instructions (Where / What / Clothing, and optionally the turn message) via TTS.
 * @param {{ includeMessage?: boolean }} options - In guided mode, pass { includeMessage: true } to read "Partner X giver → Partner Y receiver" first.
 */
function speakInstructions(options) {
  if (!voiceEnabled || !isSpeechSupported()) return;

  const text = getInstructionsText(options || {});
  if (text) speakText(text);
}

/**
 * Read the current instructions aloud once, even if voice is off (e.g. "Read aloud" button).
 * @param {boolean} includeMessage - In guided mode, true to include "Partner X giver → Partner Y receiver".
 */
function speakInstructionsOnce(includeMessage) {
  if (!isSpeechSupported()) return;

  const text = getInstructionsText({ includeMessage: !!includeMessage });
  if (text) speakText(text, { force: true });
}

/**
 * Speak the current instructions (always, even if voice is off) and call onEnd when done.
 * Used by guided mode so the timer starts after the reading finishes.
 * @param {{ includeMessage?: boolean }} options - In guided mode, pass { includeMessage: true }.
 * @param {function} onEnd - Called when speech ends (or immediately if nothing to speak).
 */
function speakInstructionsThen(options, onEnd) {
  const text = getInstructionsText(options || {});
  const cb = typeof onEnd === 'function' ? onEnd : null;
  if (!text) {
    if (cb) cb();
    return;
  }
  if (!isSpeechSupported()) {
    if (cb) cb();
    return;
  }
  speakText(text, { force: true, onEnd: cb });
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

// Chrome/mobile load voices asynchronously — prime cache, set default to Zira if none saved, refresh dropdowns
if (isSpeechSupported()) {
  function refreshVoiceDropdowns() {
    window.speechSynthesis.getVoices(); // prime the cache
    if (!localStorage.getItem('selectedVoiceURI')) {
      const voices = window.speechSynthesis.getVoices();
      const zira = voices.find(v => v.lang.startsWith('en') && /zira/i.test(v.name));
      if (zira) {
        selectedVoiceURI = zira.voiceURI || ('name:' + zira.name);
        localStorage.setItem('selectedVoiceURI', selectedVoiceURI);
      }
    }
    document.querySelectorAll('.voice-select').forEach(el => {
      if (typeof populateVoiceSelect === 'function') populateVoiceSelect(el);
    });
    syncVoiceSelects();
  }
  window.speechSynthesis.onvoiceschanged = refreshVoiceDropdowns;
  // Mobile: voices often load only after user interaction; re-run when document becomes visible
  if (document.visibilityState !== undefined) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && window.speechSynthesis.getVoices().length === 0) {
        setTimeout(refreshVoiceDropdowns, 100);
      }
    });
  }
}
