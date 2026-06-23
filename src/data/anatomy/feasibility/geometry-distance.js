/**
 * Geometry-first hop distance.
 *
 * The calibrated map (maps/geometry.js) is now the PRIMARY source of distance
 * between zones; the hand-tuned FU edge table is the fallback for pairs the map
 * doesn't cover (e.g. internal vaginal depth, body landmarks not drawn).
 *
 * Each view's 0–1000 pixel space is calibrated to finger units (FU) by fitting
 * the measured pixel distances to the curated FU edges that span the same view.
 * That keeps geometry distances on the same scale the travel phrasing expects,
 * and exposes where the old hand-tuned table disagreed with the art.
 */

import {
  CANON_GEOMETRY,
  VIEW_ORDER,
  geometryInView,
  pixelDistance,
} from '../maps/geometry.js'
import {
  CURATED_EDGE_FU,
  edgeKey,
  edgeDistanceFu,
  hasCuratedEdge,
  travelScaleFromFu,
  zoneTypicalFu,
} from '../actions/sequence-zone-distance.js'

const median = (xs) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * Per-view FU-per-pixel scale, fitted to curated edges that fall inside the view.
 * Falls back to a default derived from clitoral micro-structures if a view has
 * too few anchored edges.
 */
function calibrateViews() {
  /** @type {Record<string, { scale:number, samples:number, disagreements:object[] }>} */
  const out = {}
  for (const view of VIEW_ORDER) {
    const zones = Object.keys(CANON_GEOMETRY[view] || {})
    const ratios = []
    const disagreements = []
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        const a = zones[i]
        const b = zones[j]
        if (!hasCuratedEdge(a, b)) continue
        const px = pixelDistance(a, b, view)
        if (!px) continue
        const curated = CURATED_EDGE_FU[edgeKey(a, b)]
        ratios.push(curated / px)
        disagreements.push({ a, b, curated, px })
      }
    }
    const scale = median(ratios) ?? 0.015 // ~67px per FU default
    // annotate how far each curated edge sits from the fitted scale
    for (const d of disagreements) {
      d.geomFu = +(d.px * scale).toFixed(2)
      d.ratio = +(d.geomFu / d.curated).toFixed(2)
    }
    out[view] = {
      scale,
      samples: ratios.length,
      disagreements: disagreements
        .filter((d) => d.geomFu >= d.curated * 1.8 || d.geomFu <= d.curated * 0.55)
        .sort((x, y) => Math.abs(Math.log(y.ratio)) - Math.abs(Math.log(x.ratio))),
    }
  }
  return out
}

export const VIEW_CALIBRATION = calibrateViews()

/**
 * Distance in FU between two zones using the calibrated map, if both appear in a
 * shared view. Prefers closeups (finer detail) over full-body views.
 * @returns {{ fu:number, view:string, px:number, scale:number, sideChange:boolean } | null}
 */
export function geometryDistanceFu(a, b) {
  for (const view of VIEW_ORDER) {
    const ga = geometryInView(a, view)
    const gb = geometryInView(b, view)
    if (!ga || !gb) continue
    const px = pixelDistance(a, b, view)
    if (px == null) continue
    const scale = VIEW_CALIBRATION[view].scale
    return {
      fu: +(px * scale).toFixed(2),
      view,
      px: +px.toFixed(1),
      scale,
      sideChange: ga.side !== 'M' && gb.side !== 'M' && ga.side !== gb.side,
    }
  }
  return null
}

/**
 * Resolved hop distance: geometry first, curated/estimated FU fallback.
 * @returns {{ fu:number, scale:string, source:'geometry'|'curated'|'estimate', view?:string, sideChange?:boolean }}
 */
export function hopDistanceFu(a, b) {
  const g = geometryDistanceFu(a, b)
  if (g) {
    return {
      fu: g.fu,
      scale: travelScaleFromFu(g.fu),
      source: 'geometry',
      view: g.view,
      sideChange: g.sideChange,
    }
  }
  const fu = edgeDistanceFu(a, b)
  return {
    fu,
    scale: travelScaleFromFu(fu),
    source: hasCuratedEdge(a, b) ? 'curated' : 'estimate',
  }
}

export { travelScaleFromFu, zoneTypicalFu }
