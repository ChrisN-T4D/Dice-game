/**
 * Registry of sensate guided presets (maps UI id → technique + script layout).
 * Research/clinical rationale and citations: docs/sensate-guided-sessions-references.md
 */

export const SENSATE_PRESETS = [
  {
    id: 'phase1_non_genital',
    techniqueId: 'SF_PHASE1_NON_GENITAL',
    title: 'Phase 1: Non-genital touch',
    blurb: 'Turn-taking touch head to toe; breasts and genitals off limits. Sensory curiosity only.',
    supportsFirstToucherChoice: true,
  },
  {
    id: 'phase1_genital_included',
    techniqueId: 'SF_PHASE1_GENITAL_INCLUDED',
    title: 'Phase 1: Full body (non-demand)',
    blurb: 'Includes breasts and genitals with even attention and no performance goals.',
    supportsFirstToucherChoice: true,
  },
  {
    id: 'phase1_lotion',
    techniqueId: 'SF_PHASE1_LOTION_LUBRICANT',
    title: 'Lotion and lubricant',
    blurb: 'Same attitude with warmed lotion or oil and water-based lubricant where appropriate.',
    supportsFirstToucherChoice: true,
  },
  {
    id: 'mutual_touching',
    techniqueId: 'SF_MUTUAL_TOUCHING',
    title: 'Mutual touching',
    blurb: 'Touch each other at once, with no single giver. Skip kissing and oral sex for this round.',
    supportsFirstToucherChoice: false,
  },
  {
    id: 'phase2_communication',
    techniqueId: 'SF_PHASE2_PARTNER_COMMUNICATION',
    title: 'Phase 2: Gentle communication',
    blurb: 'Slow touch plus short, informational sharing, after you are solid with silent Phase 1 style work.',
    supportsFirstToucherChoice: false,
  },
]

export function getSensatePresetById(presetId) {
  return SENSATE_PRESETS.find((p) => p.id === presetId) || null
}
