#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const positions = [7, 18, 33, 47, 62, 79, 88, 99, 112, 121, 131, 5, 42, 95, 144];
const content = fs.readFileSync(path.join(__dirname, '..', 'phase3-positions-data.js'), 'utf8');
const lines = content.split('\n');

for (const pos of positions) {
  const re = new RegExp('positionNumber:\\s*' + pos + '\\s*[,}]');
  const line = lines.find(l => re.test(l));
  if (!line) {
    console.log(pos + ': (no entry)\n');
    continue;
  }
  const nameMatch = line.match(/name:\s*'([^']*(?:\\'[^']*)*)'/);
  const name = nameMatch ? nameMatch[1].replace(/\\'/g, "'") : '?';
  const helpMatch = line.match(/help:\s*'([^']*(?:\\'[^']*)*)'/);
  let help = helpMatch ? helpMatch[1].replace(/\\'/g, "'") : '';
  if (help.length > 85) help = help.slice(0, 82) + '...';
  console.log('Position ' + pos + ' | ' + name);
  console.log('  Help: ' + help);
  console.log('');
}
