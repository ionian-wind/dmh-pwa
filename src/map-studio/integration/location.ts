import { openDB } from '@/utils/storage';

export interface StudioLocationOption {
  id: string;
  name: string;
}

export async function listStudioLocationOptions(): Promise<
  StudioLocationOption[]
> {
  const db = await openDB();
  const records = await db.table<any, string>('map_locations').toArray();
  return records
    .map((record) => ({
      id: String(record.id),
      name: String(record.name || record.title || 'Location'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Rasterize a studio map into the existing location background image slot.
 * The studio does not touch markers, areas, layers or entity links.
 */
export async function applyStudioImageToLocation(
  locationId: string,
  blob: Blob,
  filename: string,
): Promise<boolean> {
  if (!__FEATURE_MAPS__) return false;
  const [{ createMapFileFromFile }, { putMapFile }, { normalizeLocationMap }] =
    await Promise.all([
      import('@/maps/utils/mapFileUtils'),
      import('@/maps/maps'),
      import('@/utils/maps/normalize'),
    ]);
  const db = await openDB();
  const locations = db.table<any, string>('map_locations');
  const location = await locations.get(locationId);
  if (!location) return false;

  const file = await createMapFileFromFile(
    new File([blob], filename, { type: blob.type || 'image/png' }),
  );
  await putMapFile(file);
  await locations.put({
    ...location,
    map: { ...normalizeLocationMap(location.map), fileId: file.id },
    updatedAt: Date.now(),
  });
  return true;
}
