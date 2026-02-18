#!/usr/bin/env node
'use strict';
/**
 * Set the entry for a single position number. Replaces only the line that contains
 * "positionNumber: N" so the correct slot is always updated.
 *
 * Usage: node scripts/set-position-entry.js <positionNumber> '<full entry line>'
 * The new line must include ", positionNumber: N }," at the end (N = position number).
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'phase3-positions-data.js');
const posNum = parseInt(process.argv[2], 10);
let newLine = process.argv[3];

if (!posNum || posNum < 1 || posNum > 155) {
  console.error('Usage: node set-position-entry.js <positionNumber 1-155> "<full entry line>"');
  process.exit(1);
}
if (!newLine) {
  console.error('Provide the full entry line as third argument.');
  process.exit(1);
}

// Ensure the new line has positionNumber for this slot
if (!newLine.includes('positionNumber: ' + posNum)) {
  if (newLine.trim().endsWith(' },') || newLine.trim().endsWith(' }')) {
    newLine = newLine.trim().replace(/\s*\},?\s*$/, ', positionNumber: ' + posNum + ' },');
  } else {
    newLine = newLine.trim() + ', positionNumber: ' + posNum + ' },';
  }
}

const lines = fs.readFileSync(dataPath, 'utf8').split('\n');
let replaced = false;
const posNumRegex = new RegExp('positionNumber:\\s*' + posNum + '\\s*[,}]');
for (let i = 0; i < lines.length; i++) {
  if (posNumRegex.test(lines[i])) {
    const indent = lines[i].match(/^(\s*)/)[1];
    lines[i] = indent + newLine.trim();
    replaced = true;
    break;
  }
}
if (!replaced) {
  console.error('Could not find line with positionNumber: ' + posNum);
  process.exit(1);
}
fs.writeFileSync(dataPath, lines.join('\n'));
console.log('Updated position ' + posNum);
