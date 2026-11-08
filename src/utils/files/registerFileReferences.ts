import { idbGetAllItems } from '@/utils/storage';
import type { JukeboxTrack } from '@/jukebox/types';
import type { MapLocation } from '@/maps/types';
import type { Pawn, PlayerCharacter } from '@/types';
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

registerFileReferenceProvider({
  id: 'character-pictures',
  async isReferenced(fileId) {
    const characters = await idbGetAllItems<PlayerCharacter>('characters');
    return characters.some((character) => character.picture === fileId);
  },
});

registerFileReferenceProvider({
  id: 'pawn-pictures',
  async isReferenced(fileId) {
    const pawns = await idbGetAllItems<Pawn>('pawns');
    return pawns.some((pawn) => pawn.picture === fileId);
  },
});
