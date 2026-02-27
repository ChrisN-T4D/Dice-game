import { watch, onUnmounted } from 'vue'
import { getPlaylistById } from '@/data/music'

/**
 * Plays background music from public/music when prefs.backgroundMusic is set.
 * Single track: loops that file. Playlist: plays each track in order, then repeats the playlist.
 */
export function useBackgroundMusic(prefs) {
  let audio = null
  let playlistTrackIndex = 0
  let currentPlaylistId = null
  /** Currently playing selection (track id or playlist id); used to avoid restarting when Play is clicked again. */
  let currentSelection = null

  function applyVolume() {
    if (!audio) return
    const pct = prefs.backgroundMusicVolume
    const vol = Math.max(0, Math.min(100, typeof pct === 'number' ? pct : 50)) / 100
    audio.volume = vol
  }

  function stop() {
    if (prefs && typeof prefs.setBackgroundMusicPlaying === 'function') prefs.setBackgroundMusicPlaying(false)
    if (audio) {
      audio.pause()
      audio.removeEventListener('ended', onTrackEnded)
      audio.src = ''
      audio = null
    }
    currentPlaylistId = null
    currentSelection = null
  }

  function playTrack(filename) {
    if (!filename) return
    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || ''
    const encoded = encodeURIComponent(String(filename))
    const src = `${base.replace(/\/$/, '')}/music/${encoded}.mp3`
    audio = new Audio(src)
    audio.addEventListener('error', () => { audio = null })
    applyVolume()
    audio.play().catch(() => {})
    if (prefs && typeof prefs.setBackgroundMusicPlaying === 'function') prefs.setBackgroundMusicPlaying(true)
  }

  function playNextInPlaylist() {
    const playlist = currentPlaylistId ? getPlaylistById(currentPlaylistId) : null
    if (!playlist || !playlist.trackIds.length) return
    if (audio) {
      audio.pause()
      audio.removeEventListener('ended', onTrackEnded)
      audio.src = ''
    }
    const trackIndex = playlistTrackIndex % playlist.trackIds.length
    const trackId = playlist.trackIds[trackIndex]
    playlistTrackIndex = (trackIndex + 1) % playlist.trackIds.length
    playTrack(trackId)
    if (audio) audio.addEventListener('ended', onTrackEnded)
  }

  function onTrackEnded() {
    playNextInPlaylist()
  }

  function play(selection) {
    if (!selection || selection === 'none') {
      stop()
      return
    }
    if (audio && currentSelection === selection) return
    stop()
    currentSelection = selection
    if (prefs && typeof prefs.setBackgroundMusicPlaying === 'function') prefs.setBackgroundMusicPlaying(true)

    const playlist = getPlaylistById(selection)
    if (playlist) {
      currentPlaylistId = selection
      playlistTrackIndex = 0
      playNextInPlaylist()
      return
    }

    // Single track: loop this file
    playTrack(selection)
    if (audio) {
      audio.loop = true
    }
  }

  watch(
    () => prefs.backgroundMusic,
    (selection) => {
      if (prefs._playingFromUI) return
      const isNone = !selection || String(selection).toLowerCase().trim() === 'none'
      if (isNone) {
        stop()
        return
      }
      play(selection)
    },
    { immediate: true }
  )

  watch(
    () => prefs.backgroundMusicVolume,
    () => applyVolume(),
    { immediate: true }
  )

  onUnmounted(stop)

  if (prefs && typeof prefs.setStopBackgroundMusic === 'function') {
    prefs.setStopBackgroundMusic(stop)
  }

  return { stop, play }
}
