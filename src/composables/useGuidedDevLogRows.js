import { computed } from 'vue'

/** Rows for Guided dev overlay: session audio log with relative time + pause durations. */
export function useGuidedDevLogRows(guided) {
  return computed(() => {
    const log = guided.devAudioLog || []
    const base = log[0]?.t ?? Date.now()
    return log.map((entry, i) => {
      const next = log[i + 1]
      const elapsed = ((entry.t - base) / 1000).toFixed(1)
      const duration = entry.type === 'pause' && next?.type === 'resume' ? ((next.t - entry.t) / 1000).toFixed(1) : null
      return {
        type: entry.type,
        time: `+${elapsed}s`,
        duration: duration ?? undefined,
        text: entry.text || undefined,
        source: entry.source || undefined,
        reason: entry.reason || undefined,
      }
    })
  })
}

/** Cooking log rows for dev overlay. */
export function useGuidedCookingLogRows(guided) {
  return computed(() => {
    const log = guided.cookingLog || []
    const base = log[0]?.t ?? Date.now()
    return log.map((entry) => {
      const elapsed = ((entry.t - base) / 1000).toFixed(1)
      return {
        time: `+${elapsed}s`,
        phraseIndex: entry.phraseIndex,
        phase: entry.phase,
        size: entry.size,
        message: entry.message,
        textSnippet: entry.textSnippet,
        retry: entry.retry,
        background: entry.background,
      }
    })
  })
}
