/** Shared helpers for sequence cluster authoring. */

export function stim(pressure, tempo, friction = 'medium') {
  return {
    pressure: { level: pressure },
    tempo: { level: tempo },
    friction: { level: friction },
  }
}

export const C = {
  pointEdge: { footprint: 'point', coverage: 'edge_only' },
  linearEdge: { footprint: 'linear', coverage: 'edge_only' },
  linearPartial: { footprint: 'linear', coverage: 'partial' },
  patchPartial: { footprint: 'patch', coverage: 'partial' },
  patchFull: { footprint: 'patch', coverage: 'full' },
}
