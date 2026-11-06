import { idbGetAllItems } from '@/utils/storage';
import type { JukeboxTrack } from '@/jukebox/types';
import type { MapLocation } from '@/maps/types';
import { registerFileReferenceProvider } from './fileReferences';

registerFileReferenceProvider({
  id: 'jukebox-tracks',
  async isReferenced(fileId) {
    const tracks = await idbGetAllItems<JukeboxTrack>('jukebox_tracks');
    return tracks.some((track) => track.fileId === fileId);
  },
});

registerFileReferenceProvider({
  id: 'map-locations',
  async isReferenced(fileId) {
    const locations = await idbGetAllItems<MapLocation>('map_locations');
    return locations.some((location) => location.map?.fileId === fileId);
  },
});
