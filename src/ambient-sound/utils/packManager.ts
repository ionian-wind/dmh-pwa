import Dexie from 'dexie';
import JSZip from 'jszip';
import type { NormalizedSoundPack, SoundPackManifest } from '../types';
import { deepUnwrap } from '@/utils/deepUnwrap';
import { openDB, type DmhDatabase } from '@/utils/storage';
import { saveBlob } from '@/utils/files/save';
import {
  openZip,
  readZipBlob as readZipEntryBlob,
  readZipText,
  type ZipEntries,
} from '@/utils/files/zip';
import {
  getLayerVariations,
  getOneShotSamples,
  getSceneMusicFile,
  normalizeSoundPack,
} from './packData';

const LEGACY_DB_NAME = 'dmh-ambient-sound';
const LEGACY_DB_VERSION = 1;
const MERGED_KEY = 'dmh-ambient-sound-merged';

interface SoundPackRecord {
  id: string;
  manifest: NormalizedSoundPack;
  audioBlobs: Record<string, Blob>;
  addedAt: number;
  origin: 'imported' | 'created';
}

function hasMergedLegacyPacks(): boolean {
  try {
    return localStorage.getItem(MERGED_KEY) === '1';
  } catch {
    return false;
  }
}

function markLegacyPacksMerged(): void {
  try {
    localStorage.setItem(MERGED_KEY, '1');
  } catch {
    // Storage may be unavailable; the migration stays idempotent.
  }
}

let legacyMigration: Promise<void> | null = null;
let dbPromise: Promise<DmhDatabase> | null = null;

async function migrateLegacyPacks(db: DmhDatabase): Promise<void> {
  if (legacyMigration) return legacyMigration;

  legacyMigration = (async () => {
    if (hasMergedLegacyPacks()) return;
    if (!(await Dexie.exists(LEGACY_DB_NAME))) {
      markLegacyPacksMerged();
      return;
    }

    const legacy = new Dexie(LEGACY_DB_NAME);
    legacy.version(LEGACY_DB_VERSION).stores({ soundPacks: 'id' });
    try {
      await legacy.open();
      const packs = (await legacy
        .table('soundPacks')
        .toArray()) as SoundPackRecord[];
      if (packs.length > 0) {
        await db.sound_packs.bulkPut(packs);
      }

      // Only remove the old database once every record is present.
      const targetCount = await db.sound_packs.count();
      if (packs.length === 0 || targetCount >= packs.length) {
        await Dexie.delete(LEGACY_DB_NAME);
        markLegacyPacksMerged();
      }
    } finally {
      legacy.close();
    }
  })().catch((error) => {
    legacyMigration = null;
    console.warn('Failed to merge legacy ambient sound packs:', error);
  });

  return legacyMigration;
}

async function getDB(): Promise<DmhDatabase> {
  if (!dbPromise) {
    dbPromise = openDB()
      .then(async (db) => {
        await migrateLegacyPacks(db);
        return db;
      })
      .catch((error) => {
        dbPromise = null;
        throw error;
      });
  }
  return dbPromise;
}

function stripOrigin(manifest: NormalizedSoundPack): NormalizedSoundPack {
  const { origin: _origin, ...rest } = manifest;
  return rest as NormalizedSoundPack;
}

function basename(path: string): string {
  return path.split('/').pop() || path;
}

async function readZipBlob(
  entries: ZipEntries,
  candidates: string[],
): Promise<Blob | null> {
  return readZipEntryBlob(entries, candidates);
}

async function extractAudio(
  entries: ZipEntries,
  manifest: NormalizedSoundPack,
): Promise<Record<string, Blob>> {
  const audioBlobs: Record<string, Blob> = {};

  for (const ambience of manifest.ambiences) {
    for (const variation of getLayerVariations(ambience)) {
      for (const sample of variation.samples) {
        const name = basename(sample);
        const blob = await readZipBlob(entries, [
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
    for (const sample of getOneShotSamples(oneShot)) {
      const name = basename(sample);
      const blob = await readZipBlob(entries, [
        sample,
        `one-shots/${name}`,
        `sfx/${name}`,
        name,
      ]);
      if (blob) audioBlobs[sample] = blob;
    }
  }

  for (const scene of manifest.scenes) {
    for (const preset of scene.musicPresets) {
      for (const musicFile of preset.files) {
        const canonical = getSceneMusicFile(scene.id, musicFile);
        const name = basename(musicFile);
        const blob = await readZipBlob(entries, [
          canonical,
          musicFile,
          `music/${name}`,
          name,
        ]);
        if (blob) audioBlobs[canonical] = blob;
      }
    }
  }

  return audioBlobs;
}

async function putPack(record: SoundPackRecord): Promise<void> {
  const db = await getDB();
  await db.sound_packs.put(deepUnwrap(record));
}

export async function importSoundPack(
  spkFile: File,
): Promise<NormalizedSoundPack> {
  const entries = await openZip(spkFile);
  const manifestText = await readZipText(entries, ['pack.json']);
  if (manifestText === null) {
    throw new Error('Invalid sound pack: missing pack.json');
  }

  const raw = JSON.parse(manifestText) as SoundPackManifest;
  if (!raw.id || !raw.name || !raw.version) {
    throw new Error('Invalid sound pack: missing required fields');
  }

  const manifest = normalizeSoundPack(raw);
  const audioBlobs = await extractAudio(entries, manifest);
  const existing = (await (await getDB()).sound_packs.get(manifest.id)) as
    SoundPackRecord | undefined;

  await putPack({
    id: manifest.id,
    manifest: stripOrigin(manifest),
    audioBlobs,
    addedAt: existing?.addedAt ?? Date.now(),
    origin: 'imported',
  });

  return { ...manifest, origin: 'imported' };
}

export async function getStoredPacks(): Promise<NormalizedSoundPack[]> {
  const db = await getDB();
  const packs = (await db.sound_packs.toArray()) as SoundPackRecord[];
  return packs
    .map((pack) => ({
      ...normalizeSoundPack(pack.manifest),
      origin: pack.origin ?? 'created',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPack(
  packId: string,
): Promise<NormalizedSoundPack | null> {
  const db = await getDB();
  const pack = (await db.sound_packs.get(packId)) as
    SoundPackRecord | undefined;
  return pack
    ? { ...normalizeSoundPack(pack.manifest), origin: pack.origin ?? 'created' }
    : null;
}

export async function getPackAudioBlobs(
  packId: string,
): Promise<Record<string, Blob>> {
  const db = await getDB();
  const pack = (await db.sound_packs.get(packId)) as
    SoundPackRecord | undefined;
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
  await db.sound_packs.delete(packId);
}

export async function packExists(packId: string): Promise<boolean> {
  const db = await getDB();
  return !!(await db.sound_packs.get(packId));
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

  const existing = (await (await getDB()).sound_packs.get(manifest.id)) as
    SoundPackRecord | undefined;
  await putPack({
    id: manifest.id,
    manifest: stripOrigin(manifest),
    audioBlobs,
    addedAt: existing?.addedAt ?? Date.now(),
    origin: existing?.origin ?? 'created',
  });
}

/** Update scene configuration without replacing package audio. */
export async function updatePackManifest(
  packId: string,
  manifestInput: SoundPackManifest,
): Promise<NormalizedSoundPack> {
  const db = await getDB();
  const existing = (await db.sound_packs.get(packId)) as
    SoundPackRecord | undefined;
  if (!existing) throw new Error('Pack not found');

  const manifest = normalizeSoundPack({ ...manifestInput, id: packId });
  const storedManifest = stripOrigin(manifest);
  await putPack({ ...existing, manifest: storedManifest });
  return { ...storedManifest, origin: existing.origin ?? 'created' };
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
  const record = (await db.sound_packs.get(packId)) as
    SoundPackRecord | undefined;
  if (!record) throw new Error('Pack not found');

  const content = await buildZip(record);
  await saveBlob(content, {
    suggestedName: `${record.manifest.id}.spk`,
    mimeType: 'application/zip',
    description: 'Sound pack',
  });
}

export async function exportSoundPack(packId: string): Promise<Blob> {
  const db = await getDB();
  const record = (await db.sound_packs.get(packId)) as
    SoundPackRecord | undefined;
  if (!record) throw new Error('Pack not found');
  return buildZip(record);
}
