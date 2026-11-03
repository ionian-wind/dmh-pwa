import { openDB, type IDBPDatabase } from 'idb';
import JSZip from 'jszip';
import type { NormalizedSoundPack, SoundPackManifest } from '../types';
import { deepUnwrap } from '@/utils/deepUnwrap';
import {
  getLayerVariations,
  getSceneMusicFile,
  normalizeSoundPack,
} from './packData';

const DB_NAME = 'dmh-ambient-sound';
const DB_VERSION = 1;

interface SoundPackRecord {
  id: string;
  manifest: NormalizedSoundPack;
  audioBlobs: Record<string, Blob>;
  addedAt: number;
}

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('soundPacks')) {
        db.createObjectStore('soundPacks', { keyPath: 'id' });
      }
    },
  });
  return dbInstance;
}

function basename(path: string): string {
  return path.split('/').pop() || path;
}

async function readZipBlob(
  zip: JSZip,
  candidates: string[],
): Promise<Blob | null> {
  for (const candidate of candidates) {
    const file = zip.file(candidate);
    if (file) return file.async('blob');
  }
  return null;
}

async function extractAudio(
  zip: JSZip,
  manifest: NormalizedSoundPack,
): Promise<Record<string, Blob>> {
  const audioBlobs: Record<string, Blob> = {};

  for (const ambience of manifest.ambiences) {
    for (const variation of getLayerVariations(ambience)) {
      for (const sample of variation.samples) {
        const name = basename(sample);
        const blob = await readZipBlob(zip, [
          sample,
          `ambiences/${name}`,
          `layers/${name}`,
          name,
        ]);
        if (blob) audioBlobs[sample] = blob;
      }
    }
  }

  for (const oneShot of manifest.oneShots) {
    const name = basename(oneShot.file);
    const blob = await readZipBlob(zip, [
      oneShot.file,
      `one-shots/${name}`,
      `sfx/${name}`,
      name,
    ]);
    if (blob) audioBlobs[oneShot.file] = blob;
  }

  for (const scene of manifest.scenes) {
    for (const musicFile of scene.music.files) {
      const canonical = getSceneMusicFile(scene.id, musicFile);
      const name = basename(musicFile);
      const blob = await readZipBlob(zip, [
        canonical,
        musicFile,
        `music/${name}`,
        name,
      ]);
      if (blob) audioBlobs[canonical] = blob;
    }
  }

  return audioBlobs;
}

async function putPack(record: SoundPackRecord): Promise<void> {
  const db = await getDB();
  await db.put('soundPacks', deepUnwrap(record));
}

export async function importSoundPack(
  spkFile: File,
): Promise<NormalizedSoundPack> {
  const arrayBuffer = await spkFile.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const manifestFile = zip.file('pack.json');
  if (!manifestFile) {
    throw new Error('Invalid sound pack: missing pack.json');
  }

  const raw = JSON.parse(
    await manifestFile.async('string'),
  ) as SoundPackManifest;
  if (!raw.id || !raw.name || !raw.version) {
    throw new Error('Invalid sound pack: missing required fields');
  }

  const manifest = normalizeSoundPack(raw);
  const audioBlobs = await extractAudio(zip, manifest);
  const existing = (await (await getDB()).get('soundPacks', manifest.id)) as
    | SoundPackRecord
    | undefined;

  await putPack({
    id: manifest.id,
    manifest,
    audioBlobs,
    addedAt: existing?.addedAt ?? Date.now(),
  });

  return manifest;
}

export async function getStoredPacks(): Promise<NormalizedSoundPack[]> {
  const db = await getDB();
  const packs = (await db.getAll('soundPacks')) as SoundPackRecord[];
  return packs
    .map((pack) => normalizeSoundPack(pack.manifest))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPack(
  packId: string,
): Promise<NormalizedSoundPack | null> {
  const db = await getDB();
  const pack = (await db.get('soundPacks', packId)) as
    | SoundPackRecord
    | undefined;
  return pack ? normalizeSoundPack(pack.manifest) : null;
}

export async function getPackAudioBlobs(
  packId: string,
): Promise<Record<string, Blob>> {
  const db = await getDB();
  const pack = (await db.get('soundPacks', packId)) as
    | SoundPackRecord
    | undefined;
  return pack?.audioBlobs || {};
}

export async function getPackBlobUrl(
  packId: string,
  filePath: string,
): Promise<string> {
  const blobs = await getPackAudioBlobs(packId);
  const blob = blobs[filePath];
  if (!blob) throw new Error(`Audio file not found: ${filePath}`);
  return URL.createObjectURL(blob);
}

export async function deletePack(packId: string): Promise<void> {
  const db = await getDB();
  await db.delete('soundPacks', packId);
}

export async function packExists(packId: string): Promise<boolean> {
  const db = await getDB();
  return !!(await db.get('soundPacks', packId));
}

export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url);
}

export async function saveSoundPack(
  manifestInput: SoundPackManifest,
  audioFiles: Map<string, Blob>,
): Promise<void> {
  const manifest = normalizeSoundPack(manifestInput);
  const audioBlobs: Record<string, Blob> = {};
  for (const [path, blob] of audioFiles) {
    audioBlobs[path] = blob;
  }

  const existing = (await (await getDB()).get('soundPacks', manifest.id)) as
    | SoundPackRecord
    | undefined;
  await putPack({
    id: manifest.id,
    manifest,
    audioBlobs,
    addedAt: existing?.addedAt ?? Date.now(),
  });
}

/** Update scene configuration without replacing package audio. */
export async function updatePackManifest(
  packId: string,
  manifestInput: SoundPackManifest,
): Promise<NormalizedSoundPack> {
  const db = await getDB();
  const existing = (await db.get('soundPacks', packId)) as
    | SoundPackRecord
    | undefined;
  if (!existing) throw new Error('Pack not found');

  const manifest = normalizeSoundPack({ ...manifestInput, id: packId });
  await putPack({ ...existing, manifest });
  return manifest;
}

async function buildZip(record: SoundPackRecord): Promise<Blob> {
  const zip = new JSZip();
  zip.file('pack.json', JSON.stringify(record.manifest, null, 2));

  for (const [filePath, blob] of Object.entries(record.audioBlobs)) {
    zip.file(filePath, blob);
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function exportSoundPackAsFile(packId: string): Promise<void> {
  const db = await getDB();
  const record = (await db.get('soundPacks', packId)) as
    | SoundPackRecord
    | undefined;
  if (!record) throw new Error('Pack not found');

  const content = await buildZip(record);
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${record.manifest.id}.spk`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportSoundPack(packId: string): Promise<Blob> {
  const db = await getDB();
  const record = (await db.get('soundPacks', packId)) as
    | SoundPackRecord
    | undefined;
  if (!record) throw new Error('Pack not found');
  return buildZip(record);
}
