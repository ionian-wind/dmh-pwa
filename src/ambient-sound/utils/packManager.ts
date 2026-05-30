import { openDB, type IDBPDatabase } from 'idb';
import JSZip from 'jszip';
import type { SoundPackManifest } from '../types';

const DB_NAME = 'dmh-ambient-sound';
const DB_VERSION = 1;

interface SoundPackRecord {
  id: string;
  manifest: SoundPackManifest;
  audioBlobs: Record<string, Blob>;
  addedAt: number;
}

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('soundPacks')) {
        db.createObjectStore('soundPacks', { keyPath: 'id' });
      }
    },
  });
  return dbInstance;
}

export async function importSoundPack(
  spkFile: File,
): Promise<SoundPackManifest> {
  const arrayBuffer = await spkFile.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const manifestFile = zip.file('pack.json');
  if (!manifestFile) {
    throw new Error('Invalid sound pack: missing pack.json');
  }

  const manifest: SoundPackManifest = JSON.parse(
    await manifestFile.async('string'),
  );

  if (!manifest.id || !manifest.name || !manifest.version) {
    throw new Error('Invalid sound pack: missing required fields');
  }

  const audioBlobs: Record<string, Blob> = {};

  for (const layer of manifest.layers) {
    const file = zip.file(`layers/${layer.file}`);
    if (file) {
      audioBlobs[`layers/${layer.file}`] = await file.async('blob');
    }
  }

  for (const sfx of manifest.oneShots) {
    const file = zip.file(`sfx/${sfx.file}`);
    if (file) {
      audioBlobs[`sfx/${sfx.file}`] = await file.async('blob');
    }
  }

  for (const mood of manifest.moodStates) {
    if (mood.musicFile) {
      const file = zip.file(`music/${mood.musicFile}`);
      if (file) {
        audioBlobs[`music/${mood.musicFile}`] = await file.async('blob');
      }
    }
  }

  if (manifest.weatherSystems) {
    for (const weather of manifest.weatherSystems) {
      if (weather.file) {
        const file = zip.file(`weather/${weather.file}`);
        if (file) {
          audioBlobs[`weather/${weather.file}`] = await file.async('blob');
        }
      }
    }
  }

  const db = await getDB();

  const existing = await db.get('soundPacks', manifest.id);
  if (existing) {
    await db.put('soundPacks', {
      ...existing,
      manifest,
      audioBlobs,
      addedAt: Date.now(),
    } as SoundPackRecord);
  } else {
    await db.put('soundPacks', {
      id: manifest.id,
      manifest,
      audioBlobs,
      addedAt: Date.now(),
    } as SoundPackRecord);
  }

  return manifest;
}

export async function getStoredPacks(): Promise<SoundPackManifest[]> {
  const db = await getDB();
  const packs = await db.getAll('soundPacks');
  return packs
    .map((p: unknown) => (p as SoundPackRecord).manifest)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPackAudioBlobs(
  packId: string,
): Promise<Record<string, Blob>> {
  const db = await getDB();
  const pack = await db.get('soundPacks', packId);
  return (pack as SoundPackRecord | undefined)?.audioBlobs || {};
}

export async function getPackBlobUrl(
  packId: string,
  filePath: string,
): Promise<string> {
  const db = await getDB();
  const pack = await db.get('soundPacks', packId);
  const record = pack as SoundPackRecord | undefined;
  if (record?.audioBlobs[filePath]) {
    return URL.createObjectURL(record.audioBlobs[filePath]);
  }
  throw new Error(`Audio file not found: ${filePath}`);
}

export async function deletePack(packId: string): Promise<void> {
  const db = await getDB();
  await db.delete('soundPacks', packId);
}

export async function packExists(packId: string): Promise<boolean> {
  const db = await getDB();
  const pack = await db.get('soundPacks', packId);
  return !!pack;
}

export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url);
}

export async function saveSoundPack(
  manifest: SoundPackManifest,
  audioFiles: Map<string, Blob>,
): Promise<void> {
  const audioBlobs: Record<string, Blob> = {};
  for (const [path, blob] of audioFiles) {
    audioBlobs[path] = blob;
  }

  const db = await getDB();
  const existing = await db.get('soundPacks', manifest.id);
  if (existing) {
    await db.put('soundPacks', {
      ...existing,
      manifest,
      audioBlobs,
      addedAt: Date.now(),
    } as SoundPackRecord);
  } else {
    await db.put('soundPacks', {
      id: manifest.id,
      manifest,
      audioBlobs,
      addedAt: Date.now(),
    } as SoundPackRecord);
  }
}

export async function exportSoundPackAsFile(packId: string): Promise<void> {
  const db = await getDB();
  const pack = await db.get('soundPacks', packId);
  const record = pack as SoundPackRecord | undefined;
  if (!record) {
    throw new Error('Pack not found');
  }

  const zip = new JSZip();
  zip.file('pack.json', JSON.stringify(record.manifest, null, 2));

  for (const [filePath, blob] of Object.entries(record.audioBlobs)) {
    zip.file(filePath, blob);
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
  });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${record.manifest.id}.spk`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportSoundPack(packId: string): Promise<Blob> {
  const db = await getDB();
  const pack = await db.get('soundPacks', packId);
  const record = pack as SoundPackRecord | undefined;
  if (!record) {
    throw new Error('Pack not found');
  }

  const zip = new JSZip();

  zip.file('pack.json', JSON.stringify(record.manifest, null, 2));

  for (const [filePath, blob] of Object.entries(record.audioBlobs)) {
    zip.file(filePath, blob);
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
  }) as Promise<Blob>;
}
