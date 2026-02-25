#!/usr/bin/env node
'use strict';
const fs = require('fs');

// From position-similarity-groups.md – 8 sections with position numbers
const refGroups = {
  '1_Straddle_Cowgirl': [38, 45, 48, 51, 53, 106, 110, 111, 136, 142, 146, 155],
  '2_Reverse_straddle': [1, 4, 5, 12, 18, 29, 33, 35, 36, 50, 52, 61, 67, 72, 73, 79, 80, 86, 87, 89, 99, 107, 109, 114, 120, 125, 138, 150, 152],
  '3_Missionary': [3, 7, 9, 13, 15, 16, 44, 47, 49, 54, 56, 59, 63, 68, 71, 76, 84, 88, 90, 91, 92, 95, 96, 97, 105, 108, 113, 117, 118, 130, 139, 143, 145, 149, 154],
  '4_Doggy_Rear': [6, 8, 10, 11, 14, 19, 21, 22, 23, 25, 28, 32, 40, 42, 46, 55, 65, 66, 69, 70, 74, 75, 77, 78, 81, 82, 85, 94, 103, 115, 116, 128, 129, 133, 134, 140, 144, 147, 151, 153],
  '5_Standing': [20, 30, 37, 41, 43, 93, 102, 112, 132, 135],
  '6_Elevated_Bridge': [17, 27, 39, 60, 83, 98, 104, 121],
  '7_Spooning_Sidelying': [2, 31, 34, 100, 119, 122, 123, 126, 131, 137, 141, 148],
  '8_Oral': [62, 101, 124]
};

// Map our data group -> reference similarity category
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

// Build ref position -> ref group(s)
const refPosToGroup = {};
for (const [refName, positions] of Object.entries(refGroups)) {
  for (const p of positions) {
    if (refPosToGroup[p]) refPosToGroup[p] += ', ' + refName;
    else refPosToGroup[p] = refName;
  }
}

// 1) Positions in multiple REFERENCE groups
const inMultiple = [];
for (const [pos, groups] of Object.entries(refPosToGroup)) {
  if (groups.indexOf(',') >= 0) inMultiple.push({ pos, groups });
}
console.log('=== Positions in MULTIPLE reference similarity groups ===');
if (inMultiple.length) inMultiple.forEach(x => console.log('  Position ' + x.pos + ': ' + x.groups));
else console.log('  None – each position appears in only one reference section.\n');

// 2) Load our data: positionNumber -> group (group appears before positionNumber on each line)
const content = fs.readFileSync(require('path').join(__dirname, '..', 'phase3-positions-data.js'), 'utf8');
const posToDataGroup = {};
const re = /group:\s*'([^']+)'.*?positionNumber:\s*(\d+)/g;
let m;
while ((m = re.exec(content)) !== null) {
  posToDataGroup[parseInt(m[2], 10)] = m[1];
}

// Positions you changed on purpose during validation (exclude from mismatch report)
const changedOnPurpose = new Set([
  5, 20, 21, 22, 23, 26, 28, 44, 47, 49, 50, 55, 56, 57, 58, 62, 64, 66, 68, 69, 70, 71, 74, 75, 78, 81, 82, 83, 84, 86, 88, 89, 90, 92, 93, 95, 97, 102, 104, 105, 107, 108, 109, 112, 115, 117, 121, 128, 129, 132, 133, 137, 141, 144, 148, 150
]);

// 3) Mismatches: ref says X, our data group maps to Y (different ref category). Exclude changed-on-purpose.
console.log('=== Mismatches (excluding positions you changed on purpose) ===');
const allMismatches = [];
for (const [posStr, refGroup] of Object.entries(refPosToGroup)) {
  if (refGroup.indexOf(',') >= 0) continue;
  const pos = parseInt(posStr, 10);
  if (changedOnPurpose.has(pos)) continue;
  const dataGroup = posToDataGroup[pos];
  if (!dataGroup) continue;
  const ourRef = dataGroupToRef[dataGroup];
  if (ourRef && ourRef !== refGroup) {
    allMismatches.push({ pos, refGroup, dataGroup, ourRef });
  }
}
allMismatches.sort((a, b) => a.pos - b.pos);
allMismatches.forEach(x => console.log('  Pos ' + x.pos + ': ref=' + x.refGroup + ' | data group="' + x.dataGroup + '" (maps to ' + x.ourRef + ')'));
console.log('  Total: ' + allMismatches.length + ' mismatches (excluding ' + changedOnPurpose.size + ' changed on purpose)\n');

// 4) Summary by reference similarity group: count in ref vs count in our data (same category)
console.log('=== Counts by Position Similarity Group (reference vs data) ===');
for (const [refName, refPositions] of Object.entries(refGroups)) {
  let dataMatch = 0;
  for (const p of refPositions) {
    const dg = posToDataGroup[p];
    if (dg && dataGroupToRef[dg] === refName) dataMatch++;
  }
  console.log('  ' + refName + ': ref has ' + refPositions.length + ' positions, data matches ' + dataMatch);
}
