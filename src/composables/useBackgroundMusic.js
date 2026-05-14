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
  /** Avoid ended + timeupdate both advancing the playlist in the same tick. */
  let playlistAdvanceLock = false

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
      audio.removeEventListener('timeupdate', onPlaylistTimeupdate)
      audio.src = ''
      audio = null
    }
    currentPlaylistId = null
    currentSelection = null
    playlistAdvanceLock = false
  }

  function onPlaylistTimeupdate() {
    if (!audio || !currentPlaylistId || playlistAdvanceLock) return
    const d = audio.duration
    if (!Number.isFinite(d) || d <= 0) return
    if (audio.currentTime < d - 0.35) return
    playlistAdvanceLock = true
    try {
      audio.removeEventListener('timeupdate', onPlaylistTimeupdate)
      audio.removeEventListener('ended', onTrackEnded)
      playNextInPlaylist()
    } finally {
      playlistAdvanceLock = false
    }
  }

  function playTrack(filename) {
    if (!filename) return
    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || ''
    const encoded = encodeURIComponent(String(filename))
    const src = `${base.replace(/\/$/, '')}/music/${encoded}.mp3`
    audio = new Audio(src)
    audio.loop = false
    const isPlaylist = !!currentPlaylistId
    const onAudioError = () => {
      const plId = currentPlaylistId
      audio = null
      if (prefs?.setBackgroundMusicPlaying) prefs.setBackgroundMusicPlaying(false)
      if (plId) {
        const pl = getPlaylistById(plId)
        if (pl && pl.trackIds.length) {
          const n = pl.trackIds.length
          playlistTrackIndex = (playlistTrackIndex - 1 + n) % n
          playNextInPlaylist()
        }
      }
    }
    audio.addEventListener('error', onAudioError)
    applyVolume()
    const p = audio.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        onAudioError()
      })
    }
    audio.addEventListener('playing', () => {
      if (prefs?.setBackgroundMusicPlaying) prefs.setBackgroundMusicPlaying(true)
    }, { once: true })
    if (isPlaylist) {
      audio.addEventListener('ended', onTrackEnded)
      audio.addEventListener('timeupdate', onPlaylistTimeupdate)
    }
  }

  function playNextInPlaylist() {
    const playlist = currentPlaylistId ? getPlaylistById(currentPlaylistId) : null
    if (!playlist || !playlist.trackIds.length) return
    if (audio) {
      audio.pause()
      audio.removeEventListener('ended', onTrackEnded)
      audio.removeEventListener('timeupdate', onPlaylistTimeupdate)
      audio.src = ''
    }
    const trackIndex = playlistTrackIndex % playlist.trackIds.length
    const trackId = playlist.trackIds[trackIndex]
    playlistTrackIndex = (trackIndex + 1) % playlist.trackIds.length
    playTrack(trackId)
  }

  function onTrackEnded() {
    if (!currentPlaylistId || playlistAdvanceLock) return
    playlistAdvanceLock = true
    try {
      if (audio) {
        audio.removeEventListener('timeupdate', onPlaylistTimeupdate)
        audio.removeEventListener('ended', onTrackEnded)
      }
      playNextInPlaylist()
    } finally {
      playlistAdvanceLock = false
    }
  }

  function play(selection) {
    if (!selection || selection === 'none') {
      stop()
      return
    }
    if (audio && currentSelection === selection) return
    stop()
    currentSelection = selection

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
      audio.removeEventListener('timeupdate', onPlaylistTimeupdate)
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
