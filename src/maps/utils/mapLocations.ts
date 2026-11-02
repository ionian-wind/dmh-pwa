import type { MapLocation } from '../types';

export function upsertLocation(
  locations: MapLocation[],
  location: MapLocation,
): MapLocation[] {
  const index = locations.findIndex((entry) => entry.id === location.id);
  if (index === -1) return [...locations, location];
  return locations.map((entry) =>
    entry.id === location.id ? location : entry,
  );
}

export function removeLocation(
  locations: MapLocation[],
  locationId: string,
): MapLocation[] {
  return locations.filter((location) => location.id !== locationId);
}
