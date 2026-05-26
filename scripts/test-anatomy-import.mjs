import { listZones, partnerAnatomyToOrientation } from '../src/data/anatomy/index.js'

const base = process.env.ANATOMY_API_URL || 'http://localhost:3001'
process.env.VITE_ANATOMY_API_URL = base

const female = await listZones({ orientation: 'female', region: 'genitalia', limit: 3 })
const male = await listZones({ orientation: 'male', region: 'genitalia', limit: 3 })

console.log('Import ok (API client).')
console.log('partner vulva →', partnerAnatomyToOrientation('vulva'))
console.log('Female genital zones:', female.items.map((z) => z.id))
console.log('Male genital zones:', male.items.map((z) => z.id))
