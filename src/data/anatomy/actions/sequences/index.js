import breast from './clusters/breast.js'
import clitoris from './clusters/clitoris.js'
import labia from './clusters/labia.js'
import penis from './clusters/penis.js'
import vaginal from './clusters/vaginal.js'
import neck from './clusters/neck.js'
import groin from './clusters/groin.js'
import back from './clusters/back.js'
import glutes from './clusters/glutes.js'
import limbs from './clusters/limbs.js'
import torso from './clusters/torso.js'

/** @type {import('../_makeAction.js').Action[]} */
export const sequenceCatalog = [
  ...breast,
  ...clitoris,
  ...labia,
  ...penis,
  ...vaginal,
  ...neck,
  ...groin,
  ...back,
  ...glutes,
  ...limbs,
  ...torso,
]

export default sequenceCatalog
