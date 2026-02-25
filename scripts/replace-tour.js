const fs = require('fs')
const path = require('path')

const vuePath = path.join(__dirname, '..', 'src', 'components', 'OnboardingWizard.vue')
const replPath = path.join(__dirname, '..', 'src', 'components', 'OnboardingWizard-tour-replacement.txt')

let s = fs.readFileSync(vuePath, 'utf8')
const newBlock = fs.readFileSync(replPath, 'utf8').trimEnd()

const startMark = '<div class="onboarding-tour-card onboarding-tour-freeplay">'
const endMark = '\n          </div>\n        </div>\n\n        <!-- Step 10: Voice setup'

const startIdx = s.indexOf(startMark)
const endIdx = s.indexOf(endMark)
if (startIdx === -1 || endIdx === -1) {
  console.log('Markers not found', { startIdx, endIdx })
  process.exit(1)
}
const oldBlock = s.slice(startIdx, endIdx)
s = s.slice(0, startIdx) + newBlock + s.slice(endIdx)
fs.writeFileSync(vuePath, s)
console.log('Replaced tour block successfully')
