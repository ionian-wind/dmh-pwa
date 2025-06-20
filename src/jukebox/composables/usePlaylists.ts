import { ref, computed, watch as vueWatch } from 'vue'
import { useStorage } from '@/utils/storage'
import { fileToStoredTrack, storedTrackToRuntime, StoredTrack } from './useFileSystem'
import { isChromiumFSAA } from './useFileSystem'

export interface Playlist {
  id: string
  name: string
  tracks: StoredTrack[]
}

const PLAYLISTS_KEY = 'jukebox-playlists'

export function usePlaylists() {
  const [playlists, loaded] = useStorage<Playlist[]>({
    key: PLAYLISTS_KEY,
    defaultValue: [],
  })
  const activePlaylistId = ref<string | null>(null)

  const activePlaylist = computed(() =>
    playlists.value.find(p => p.id === activePlaylistId.value) || null
  )

  // Returns runtime tracks for the active playlist
  const runtimeTracks = computed(() =>
    activePlaylist.value
      ? activePlaylist.value.tracks.map(storedTrackToRuntime).filter(Boolean)
      : []
  )

  function sanitizeStoredTrack(track: StoredTrack): StoredTrack {
    // Only keep serializable fields
    const { name, artwork, type, arrayBuffer } = track
    // Only keep arrayBuffer for non-Chromium
    if (arrayBuffer && !isChromiumFSAA()) {
      return { name, artwork, type, arrayBuffer }
    }
    return { name, artwork, type }
  }

  // Sanitize all tracks in all playlists on load (in case of legacy data)
  if (playlists.value.length > 0) {
    playlists.value.forEach(p => {
      p.tracks = p.tracks.map(sanitizeStoredTrack)
    })
  }

  async function addTrackToPlaylist(file: File, playlistId?: string) {
    const p = playlists.value.find(p => p.id === (playlistId || activePlaylistId.value))
    if (p) {
      const stored = await fileToStoredTrack(file)
      if (stored && !p.tracks.find(t => t.name === stored.name)) {
        p.tracks.push(sanitizeStoredTrack(stored))
        p.tracks = p.tracks.map(sanitizeStoredTrack)
        // Debug: log the playlist structure
        try {
          console.log('DEBUG: Playlists before save:', JSON.parse(JSON.stringify(playlists.value)))
        } catch (e) {
          console.log('DEBUG: Playlists not serializable:', e)
        }
      }
    }
  }

  function removeTrackFromPlaylist(trackName: string, playlistId?: string) {
    const p = playlists.value.find(p => p.id === (playlistId || activePlaylistId.value))
    if (p) {
      p.tracks = p.tracks.filter(t => t.name !== trackName).map(sanitizeStoredTrack)
    }
  }

  function createPlaylist(name: string) {
    const id = Math.random().toString(36).slice(2)
    playlists.value.push({ id, name, tracks: [] })
    activePlaylistId.value = id
  }

  function renamePlaylist(id: string, name: string) {
    const p = playlists.value.find(p => p.id === id)
    if (p) p.name = name
  }

  function deletePlaylist(id: string) {
    const idx = playlists.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      playlists.value.splice(idx, 1)
      if (activePlaylistId.value === id) {
        activePlaylistId.value = playlists.value[0]?.id || null
      }
    }
  }

  function setActivePlaylist(id: string) {
    activePlaylistId.value = id
  }

  return {
    playlists,
    loaded,
    activePlaylist,
    activePlaylistId,
    runtimeTracks,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    setActivePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
  }
} 