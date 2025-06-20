import { ref, watch } from 'vue'
import { isValidFSAAHandle } from './useFileSystem'

export function useAudioPlayer() {
  const audio = new Audio()
  const isPlaying = ref(false)
  const currentTrack = ref<any>(null)
  const tracks = ref<any[]>([])
  const volume = ref(1)
  const currentTime = ref(0)
  const duration = ref(0)
  const shuffle = ref(false)
  const repeat = ref<'off' | 'one' | 'all'>('off')
  const shuffledOrder = ref<any[]>([])

  function getTrackList() {
    return shuffle.value ? shuffledOrder.value : tracks.value
  }

  async function play(track?: any) {
    const list = getTrackList()
    let t = track
    if (!t && !currentTrack.value && list.length > 0) {
      t = list[0]
    }
    if (t && t !== currentTrack.value) {
      currentTrack.value = t
      if (typeof t.getFileUrl === 'function') {
        const { url } = await t.getFileUrl()
        audio.src = url
      } else {
        audio.src = t.url
      }
      audio.currentTime = 0
    }
    audio.play()
  }
  function pause() {
    audio.pause()
  }
  function next() {
    const list = getTrackList()
    const idx = list.indexOf(currentTrack.value)
    if (repeat.value === 'one') {
      audio.currentTime = 0
      audio.play()
      return
    }
    if (idx >= 0 && idx < list.length - 1) {
      play(list[idx + 1])
    } else if (repeat.value === 'all' && list.length > 0) {
      play(list[0])
    }
  }
  function prev() {
    const list = getTrackList()
    const idx = list.indexOf(currentTrack.value)
    if (idx > 0) {
      play(list[idx - 1])
    } else if (repeat.value === 'all' && list.length > 0) {
      play(list[list.length - 1])
    }
  }
  function seek(time: number) {
    audio.currentTime = time
  }
  function setVolume(v: number) {
    volume.value = v
    audio.volume = v
  }
  function toggleShuffle() {
    shuffle.value = !shuffle.value
    if (shuffle.value) {
      shuffledOrder.value = shuffleArray(tracks.value)
    } else {
      shuffledOrder.value = []
    }
  }
  function toggleRepeat() {
    if (repeat.value === 'off') repeat.value = 'all'
    else if (repeat.value === 'all') repeat.value = 'one'
    else repeat.value = 'off'
  }
  function shuffleArray(arr: any[]) {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  // Filter out tracks with invalid FSAA handles on load
  function filterInvalidTracks(tracks: any[]): any[] {
    return tracks.filter((track: any) => {
      if (track.handle) {
        return isValidFSAAHandle(track.handle)
      }
      return true
    })
  }

  // Call this after loading tracks from storage
  function loadTracksFromStorage(rawTracks: any[]): { validTracks: any[]; needsRepick: boolean } {
    const validTracks = filterInvalidTracks(rawTracks)
    if (validTracks.length === 0 && rawTracks.some((t: any) => t.handle)) {
      // All handles are invalid, prompt user to re-pick files
      return { validTracks: [], needsRepick: true }
    }
    return { validTracks, needsRepick: false }
  }

  audio.addEventListener('play', () => (isPlaying.value = true))
  audio.addEventListener('pause', () => (isPlaying.value = false))
  audio.addEventListener('timeupdate', () => (currentTime.value = audio.currentTime))
  audio.addEventListener('durationchange', () => (duration.value = audio.duration))
  audio.addEventListener('ended', next)

  watch(volume, v => (audio.volume = v))
  watch(tracks, (newTracks) => {
    if (shuffle.value) {
      shuffledOrder.value = shuffleArray(newTracks)
    }
  })

  return {
    isPlaying,
    currentTrack,
    tracks,
    volume,
    currentTime,
    duration,
    play,
    pause,
    next,
    prev,
    seek,
    setVolume,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat,
    filterInvalidTracks,
    loadTracksFromStorage,
  }
} 