import type { Migration } from '@/types/migration';

export const initialSchemaMigration: Migration = {
  version: 1,
  name: 'initial_schema',
  affectedStores: [
    'characters',
    'monsters',
    'notes',
    'parties',
    'modules',
    'encounters',
    'combats',
    'noteTypes',
    'indexations_mentions',
    'jukebox_playlists',
    'jukebox_tracks',
    'jukebox_files'
  ],
  go: async () => {}
}; 
