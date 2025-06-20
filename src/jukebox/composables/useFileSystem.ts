import { ref, watch } from 'vue'
import { parseBlob } from 'music-metadata-browser'
import { useStorage } from '../../utils/storage'

export interface StoredTrack {
  name: string
  artwork?: string | null
  arrayBuffer?: ArrayBuffer // Only for non-Chromium
  type: string
}

export function isFSAAAvailable() {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window && 'FileSystemHandle' in window;
}

export function isChromiumFSAA(): boolean {
  return isFSAAAvailable();
}

export function getPersistenceSupportMessage(): string {
  if (isChromiumFSAA()) {
    return 'Persistent playback is available in this browser. Your music files will remain accessible as long as this tab is open. After reload, you will need to re-grant permission.';
  } else {
    return 'Your browser is not supported. Please use a Chromium-based browser (Chrome, Edge, Brave, etc.) to use the music player.';
  }
}

const [storedTracks, loaded] = useStorage<StoredTrack[]>({
  key: 'jukebox_tracks',
  defaultValue: [],
})

export const tracks = ref<StoredTrack[]>([])

watch(storedTracks, (val) => {
  tracks.value = val
}, { immediate: true })

async function pickFilesFSAA(): Promise<File[]> {
  if (!isFSAAAvailable()) return [];
  // @ts-ignore
  const handles: FileSystemFileHandle[] = await window.showOpenFilePicker({
    multiple: true,
    types: [
      {
        description: 'Audio Files',
        accept: { 'audio/*': ['.mp3', '.mpeg', '.wav', '.ogg', '.flac'] },
      },
    ],
  });
  const files = await Promise.all(handles.map(h => h.getFile()));
  files.forEach((f, i) => (f as any).handle = handles[i]);
  return files;
}

export async function fileToStoredTrack(file: File): Promise<StoredTrack | null> {
  if (!file.type.startsWith('audio/')) return null;
  let artwork: string | null = null
  try {
    const metadata = await parseBlob(file)
    const pic = metadata.common.picture?.[0]
    if (pic) {
      const blob = new Blob([pic.data], { type: pic.format })
      artwork = await blobToDataURL(blob)
    }
  } catch (e) {
    // ignore metadata errors
  }
  let arrayBuffer: ArrayBuffer | undefined = undefined
  if (!isChromiumFSAA()) {
    arrayBuffer = await fileToArrayBuffer(file)
    if (!arrayBuffer || arrayBuffer.byteLength === 0) return null;
  }
  return {
    name: file.name,
    artwork,
    arrayBuffer,
    type: file.type,
  }
}

export async function addFiles(files: File[]) {
  const newTracks: StoredTrack[] = []
  for (const file of files) {
    const stored = await fileToStoredTrack(file)
    if (stored) newTracks.push(stored)
  }
  storedTracks.value = [...storedTracks.value, ...newTracks]
}

export async function clearTracks() {
  storedTracks.value = []
}

export function storedTrackToRuntime(stored: StoredTrack) {
  // No handle is stored in IndexedDB, so only reconstruct from arrayBuffer
  if (stored.arrayBuffer && stored.type) {
    const file = new File([stored.arrayBuffer], stored.name, { type: stored.type })
    if (!file.type.startsWith('audio/') || file.size === 0) {
      return null;
    }
    const url = URL.createObjectURL(file)
    return {
      name: stored.name,
      artwork: stored.artwork,
      file,
      url,
    }
  }
  // For Chromium FSAA, handle must be re-attached at runtime (not persisted)
  return null
}

export function isValidFSAAHandle(handle: any): boolean {
  return !!handle && typeof handle.getFile === 'function'
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.readAsArrayBuffer(file)
  })
}

export function useFileSystem() {
  const unsupported = !isChromiumFSAA();
  return {
    pickFiles: async () => [],
    pickFilesFSAA: unsupported ? async () => [] : pickFilesFSAA,
    clearTracks: async () => {},
    isFSAAAvailable: isChromiumFSAA,
    unsupported,
  };
} 