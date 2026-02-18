#!/usr/bin/env node
'use strict';
/**
 * Apply position-mapping to phase3-positions-data.js.
 * Reads position-entries-by-number.json (position N -> full entry line).
 * For each position N, finds the ONLY line in the data file that contains
 * "positionNumber: N" (exact, so 6 doesn't match 60) and replaces that
 * entire line with the line from the mapping.
 * This way edits go to the correct slot every time.
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'phase3-positions-data.js');
const mappingPath = path.join(__dirname, '..', 'position-entries-by-number.json');

if (!fs.existsSync(mappingPath)) {
  console.error('Missing position-entries-by-number.json. Create it first (see README or export from current list).');
  process.exit(1);
}

const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const lines = fs.readFileSync(dataPath, 'utf8').split('\n');
let applied = 0;

for (const posStr of Object.keys(mapping)) {
  const posNum = parseInt(posStr, 10);
  if (posNum < 1 || posNum > 155) continue;
  const newLine = mapping[posStr];
  if (!newLine || typeof newLine !== 'string') continue;

  const posNumRegex = new RegExp('positionNumber:\\s*' + posNum + '\\s*[,}]');
  for (let i = 0; i < lines.length; i++) {
    if (posNumRegex.test(lines[i])) {
      const indent = lines[i].match(/^(\s*)/)[1];
      const trimmed = newLine.trim();
      const lineToWrite = trimmed.endsWith(',') ? trimmed : trimmed.replace(/\s*\}\s*$/, ' },');
      lines[i] = indent + lineToWrite.replace(/^\s+/, '');
      applied++;
      break;
    }
  }
}

fs.writeFileSync(dataPath, lines.join('\n'));
console.log('Applied', applied, 'positions from position-entries-by-number.json to phase3-positions-data.js');
console.log('Each replacement was done by matching positionNumber: N so only that slot was updated.');
