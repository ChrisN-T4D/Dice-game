import { watch } from 'vue'

/**
 * Sync document.body classes for phase theme, background image, admin, main visibility, guided mode.
 */
export function useAppBodyClasses({ session, prefs, showAdmin, showMainContent }) {
  function updateBodyClass() {
    if (typeof document === 'undefined') return
    document.body.classList.remove('phase-1', 'phase-2', 'phase-3', 'bg-image-1', 'bg-image-2')
    document.body.classList.add(`phase-${session.phase}`)
    if (prefs.backgroundImage !== 'none') document.body.classList.add(`bg-image-${prefs.backgroundImage}`)
  }

  watch([() => session.phase, () => prefs.backgroundImage], updateBodyClass, { immediate: true })
  watch(showAdmin, (isAdmin) => {
    document.body.classList.toggle('admin-open', isAdmin)
  }, { immediate: true })
  watch(
    () => !showAdmin.value && showMainContent.value,
    (mainVisible) => {
      document.body.classList.toggle('app-main-visible', mainVisible)
    },
    { immediate: true }
  )
  watch(
    () => (session.uiMode === 'guided' || session.uiMode === 'sensate') && showMainContent.value,
    (isGuided) => {
      document.body.classList.toggle('guided-mode', isGuided)
    },
    { immediate: true }
  )

  return { updateBodyClass }
}
