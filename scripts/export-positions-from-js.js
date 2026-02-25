#!/usr/bin/env node
'use strict';
/**
 * Export position data FROM phase3-positions-data.js TO position-entries-by-number.json.
 * Use this to make the JSON match the JS file (single source of truth: the JS file).
 * Run after editing phase3-positions-data.js to sync the JSON.
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'phase3-positions-data.js');
const outPath = path.join(__dirname, '..', 'position-entries-by-number.json');

const content = fs.readFileSync(dataPath, 'utf8');
const lines = content.split('\n');

const mapping = {};
const posNumRegex = /positionNumber:\s*(\d+)\s*[,}]/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(posNumRegex);
  if (!m) continue;
  const posNum = parseInt(m[1], 10);
  if (posNum < 1 || posNum > 155) continue;
  let lineContent = line.trim();
  if (!lineContent.endsWith(',')) {
    lineContent = lineContent.replace(/\s*\}\s*$/, ' },');
  }
  mapping[String(posNum)] = '  ' + lineContent.replace(/^\s+/, '');
}

fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2) + '\n', 'utf8');
console.log('Exported', Object.keys(mapping).length, 'positions from phase3-positions-data.js to position-entries-by-number.json');
console.log('Single source of truth: phase3-positions-data.js (edit there, run this script to update the JSON).');
