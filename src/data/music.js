/**
 * Background music: tracks are .mp3 files in public/music/.
 * Run "npm run list-music" (or node scripts/list-music.js) to scan public/music/*.mp3
 * and generate public/music/manifest.json. The app loads that list for the dropdown.
 * If no manifest exists, the fallback list below is used (add matching .mp3 files).
 */
export const MUSIC_TRACKS = [
  { id: 'ambient', title: 'Ambient' },
  { id: 'cool-evening', title: 'Cool Evening' },
  { id: 'soft-rain', title: 'Soft Rain' },
  { id: 'candlelight', title: 'Candlelight' },
  { id: 'midnight-blue', title: 'Midnight Blue' },
  { id: 'silk-sheets', title: 'Silk Sheets' },
  { id: 'smooth-sax', title: 'Smooth Sax' },
  { id: 'velvet-room', title: 'Velvet Room' },
  { id: 'r-and-b-vibes', title: 'R&B Vibes' },
  { id: 'soulful-night', title: 'Soulful Night' },
]

export const MUSIC_PLAYLISTS = [
  {
    id: 'smoothJazz',
    title: 'Smooth Jazz',
    trackIds: ['smooth-sax', 'cool-evening', 'midnight-blue', 'velvet-room', 'silk-sheets'],
  },
  {
    id: 'rnb',
    title: 'R&B',
    trackIds: ['r-and-b-vibes', 'soulful-night', 'candlelight', 'soft-rain'],
  },
]

/** Playlists from last manifest load (used by getPlaylistById). */
let manifestPlaylists = null

/** Fetch track list and playlists from public/music/manifest.json. Falls back to getMusicOptions(). */
export async function fetchMusicOptions() {
  manifestPlaylists = null
  try {
    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || ''
    const url = `${base.replace(/\/$/, '')}/music/manifest.json`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      const tracks = Array.isArray(data.tracks) ? data.tracks : Array.isArray(data) ? data : []
      const playlists = Array.isArray(data.playlists) ? data.playlists : []
      if (tracks.length > 0) {
        manifestPlaylists = playlists
        const options = [{ id: 'none', title: 'None', isPlaylist: false }]
        tracks.forEach((t) => options.push({ id: t.id, title: t.title || t.id, isPlaylist: false }))
        playlists.forEach((p) => options.push({ id: p.id, title: p.title || p.id, isPlaylist: true }))
        return options
      }
    }
  } catch (_) {}
  return getMusicOptions()
}

/** Sync options (none + MUSIC_TRACKS + MUSIC_PLAYLISTS). Used as fallback when manifest is missing. */
export function getMusicOptions() {
  const options = [{ id: 'none', title: 'None', isPlaylist: false }]
  MUSIC_TRACKS.forEach((t) => options.push({ id: t.id, title: t.title, isPlaylist: false }))
  MUSIC_PLAYLISTS.forEach((p) => options.push({ id: p.id, title: p.title, isPlaylist: true }))
  return options
}

export function getPlaylistById(id) {
  if (manifestPlaylists && manifestPlaylists.length) {
    const p = manifestPlaylists.find((x) => x.id === id)
    if (p) return p
  }
  return MUSIC_PLAYLISTS.find((p) => p.id === id) || null
}

export function getTrackById(id) {
  return MUSIC_TRACKS.find((t) => t.id === id) || null
}
