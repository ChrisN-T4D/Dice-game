#!/usr/bin/env node
'use strict';
/**
 * Compares Position References/position-similarity-groups.md to phase3-positions-data.js.
 * Outputs positions where the current name/group likely doesn't match the ref doc (possible unsynced edits).
 * Run: node scripts/compare-ref-to-data.js
 */
const fs = require('fs');
const path = require('path');

const refPath = path.join(__dirname, '..', 'Position References', 'position-similarity-groups.md');
const dataPath = path.join(__dirname, '..', 'phase3-positions-data.js');

const refContent = fs.readFileSync(refPath, 'utf8');
const dataContent = fs.readFileSync(dataPath, 'utf8');

// Parse ref doc: section header -> group key; table rows -> position number, note
const refPositions = {}; // positionNumber -> { refGroup, refNote }
const sectionHeads = [
  { key: '1_Straddle_Cowgirl', terms: ['straddle', 'cowgirl', 'lap', 'lotus', 'seated'] },
  { key: '2_Reverse_straddle', terms: ['reverse', 'facing away', 'cowgirl'] },
  { key: '3_Missionary', terms: ['missionary', 'supine', 'legs wide', 'legs up', 'face-to-face'] },
  { key: '4_Doggy_Rear', terms: ['doggy', 'prone', 'rear', 'all fours', 'bent over', 'standing doggy'] },
  { key: '5_Standing', terms: ['standing', 'carry', 'leg lift', 'wall'] },
  { key: '6_Elevated_Bridge', terms: ['elevated', 'legs up', 'bridge', 'arch'] },
  { key: '7_Spooning_Sidelying', terms: ['spooning', 'side-lying', 'side lying'] },
  { key: '8_Oral', terms: ['oral', 'cunnilingus', 'fellatio'] }
];

let currentRefGroup = null;
let pastSummary = false;
const tableRowRe = /^\|\s*(\d+)\s*\|\s*(.+?)\s*\|/;

for (const rawLine of refContent.split(/\r?\n/)) {
  const line = rawLine.trimEnd();
  if (line.startsWith('## Summary')) { pastSummary = true; continue; }
  const sectionMatch = line.match(/^##\s*(\d+)\.\s/);
  if (sectionMatch) {
    pastSummary = false;
    const n = sectionMatch[1];
    if (n === '1') currentRefGroup = '1_Straddle_Cowgirl';
    else if (n === '2') currentRefGroup = '2_Reverse_straddle';
    else if (n === '3') currentRefGroup = '3_Missionary';
    else if (n === '4') currentRefGroup = '4_Doggy_Rear';
    else if (n === '5') currentRefGroup = '5_Standing';
    else if (n === '6') currentRefGroup = '6_Elevated_Bridge';
    else if (n === '7') currentRefGroup = '7_Spooning_Sidelying';
    else if (n === '8') currentRefGroup = '8_Oral';
    continue;
  }
  if (pastSummary) continue;
  const rowMatch = line.match(tableRowRe);
  if (rowMatch && currentRefGroup) {
    const pos = parseInt(rowMatch[1], 10);
    const note = rowMatch[2].trim().replace(/\r$/, '');
    // Skip summary table rows (Notes column is like "Straddle / Cowgirl" or "12")
    if (note.length > 20 && !/^\d+$/.test(note) && pos <= 155) refPositions[pos] = { refGroup: currentRefGroup, refNote: note };
  }
}

// Data group -> ref group (same as check-similarity-groups.js)
const dataGroupToRef = {
  straddle: '1_Straddle_Cowgirl',
  reverse_straddle: '2_Reverse_straddle',
  missionary: '3_Missionary',
  doggy: '4_Doggy_Rear',
  prone: '4_Doggy_Rear',
  standing_bent_over: '4_Doggy_Rear',
  standing_carry: '5_Standing',
  standing_leg_lift: '5_Standing',
  standing_wall: '5_Standing',
  standing_rear: '4_Doggy_Rear',
  standing_wrap: '5_Standing',
  kneeling_rear_entry: '4_Doggy_Rear',
  legs_elevated: '6_Elevated_Bridge',
  bridge: '6_Elevated_Bridge',
  legs_raised_wide: '6_Elevated_Bridge',
  side_lying: '7_Spooning_Sidelying',
  side_saddle_rear: '7_Spooning_Sidelying',
  oral: '8_Oral',
  mutual_stimulation: '8_Oral',
  wheelbarrow: '4_Doggy_Rear',
  leg_wrapped: '3_Missionary',
  kneeling_wrap: '3_Missionary',
  one_leg_over_shoulder: '3_Missionary',
  scissors: null,
  seated_embrace: '1_Straddle_Cowgirl',
  seated_lap: '1_Straddle_Cowgirl',
  seated_rear: null,
  other: null,
  rollers_choice: null
};

// Extract from JS: positionNumber -> { name, group } (one entry per line)
const posToData = {};
const lineRe = /name:\s*'([^']*(?:\\'[^']*)*)'[^}]*?group:\s*'([^']+)'[^}]*?positionNumber:\s*(\d+)/;
for (const line of dataContent.split('\n')) {
  const m = line.match(lineRe);
  if (m) {
    const pos = parseInt(m[3], 10);
    posToData[pos] = { name: m[1].replace(/\\'/g, "'"), group: m[2] };
  }
}

// Key terms per ref group (first word or main term from ref note often enough)
function refNoteKeyTerm(refGroup, refNote) {
  const lower = refNote.toLowerCase();
  if (refGroup === '3_Missionary') return lower.includes('missionary') ? 'missionary' : (lower.includes('legs') || lower.includes('supine') ? 'missionary' : null);
  if (refGroup === '4_Doggy_Rear') return (lower.includes('doggy') || lower.includes('prone') || lower.includes('rear')) ? 'doggy' : null;
  if (refGroup === '2_Reverse_straddle') return (lower.includes('reverse') || lower.includes('facing away')) ? 'reverse' : null;
  if (refGroup === '1_Straddle_Cowgirl') return (lower.includes('straddle') || lower.includes('cowgirl') || lower.includes('lap')) ? 'straddle' : null;
  if (refGroup === '5_Standing') return (lower.includes('standing') || lower.includes('carry')) ? 'standing' : null;
  if (refGroup === '6_Elevated_Bridge') return (lower.includes('legs') || lower.includes('bridge') || lower.includes('elevated') || lower.includes('arch')) ? 'elevated' : null;
  if (refGroup === '7_Spooning_Sidelying') return (lower.includes('spooning') || lower.includes('side')) ? 'side' : null;
  if (refGroup === '8_Oral') return (lower.includes('oral') || lower.includes('cunnilingus') || lower.includes('fellatio')) ? 'oral' : null;
  return null;
}

const noRef = [24, 26, 64, 127];
const possibleMismatch = [];
const groupMismatch = [];

for (let pos = 1; pos <= 155; pos++) {
  if (noRef.includes(pos)) continue;
  const ref = refPositions[pos];
  const data = posToData[pos];
  if (!data) continue;
  if (!ref) continue;

  const dataMapsTo = dataGroupToRef[data.group] || null;
  if (dataMapsTo && dataMapsTo !== ref.refGroup) {
    groupMismatch.push({ pos, refGroup: ref.refGroup, refNote: ref.refNote, dataGroup: data.group, dataMapsTo, name: data.name });
  }

  const keyTerm = refNoteKeyTerm(ref.refGroup, ref.refNote);
  if (!keyTerm) continue;
  const nameLower = data.name.toLowerCase();
  const hasTerm = nameLower.includes(keyTerm) ||
    (keyTerm === 'doggy' && (nameLower.includes('rear entry') || nameLower.includes('prone'))) ||
    (keyTerm === 'reverse' && nameLower.includes('reverse')) ||
    (keyTerm === 'standing' && (nameLower.includes('standing') || nameLower.includes('carry'))) ||
    (keyTerm === 'elevated' && (nameLower.includes('leg') || nameLower.includes('bridge') || nameLower.includes('elevated'))) ||
    (keyTerm === 'side' && (nameLower.includes('side') || nameLower.includes('spooning'))) ||
    (keyTerm === 'oral' && nameLower.includes('oral'));
  if (!hasTerm) {
    possibleMismatch.push({ pos, refGroup: ref.refGroup, refNote: ref.refNote, name: data.name });
  }
}

console.log('=== Ref doc vs data: possible name mismatches (ref note suggests different position) ===\n');
console.log('These positions have a ref note whose main category does not clearly appear in the current name.\n');
possibleMismatch.sort((a, b) => a.pos - b.pos);
possibleMismatch.forEach(({ pos, refGroup, refNote, name }) => {
  console.log(`Position ${pos}:`);
  console.log(`  Ref (${refGroup}): ${refNote}`);
  console.log(`  Data name: ${name}`);
  console.log('');
});

console.log('=== Group mismatch (data group maps to different ref category) ===\n');
groupMismatch.sort((a, b) => a.pos - b.pos);
groupMismatch.forEach(({ pos, refGroup, dataGroup, name }) => {
  console.log(`Position ${pos}: ref=${refGroup} | data group="${dataGroup}" | ${name}`);
});

console.log('\n--- Summary ---');
console.log('Possible name mismatches:', possibleMismatch.length);
console.log('Group mismatches:', groupMismatch.length);
console.log('\nFix by editing phase3-positions-data.js for each position, then run: node scripts/export-positions-from-js.js');
