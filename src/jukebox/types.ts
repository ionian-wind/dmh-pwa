import type {
  WithMetadata,
  UUID as GlobalUUID,
  WithId,
  WithTimestamps,
} from '@/types';
import type { MapEntityRef } from '@/maps/types';

export type UUID = GlobalUUID;

export interface JukeboxPlaylist extends WithId, WithTimestamps, WithMetadata {
  name: string;
  description?: string;
  trackIds: UUID[];
  sortOrder?: number;
  links?: MapEntityRef[];
}

export interface JukeboxTrack extends WithMetadata {
  fileId: UUID;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  artworkUrl?: string;
  playlistIds: UUID[];
  genre?: string;
  year?: string | number;
  trackNumber?: string | number;
  discNumber?: string | number;
  composer?: string;
  comment?: string;
  lyrics?: string;
  picture?: string | Blob; // base64, object URL, or Blob for artwork
  color?: string; // dominant color from artwork
  palette?: string[]; // color palette from artwork
  waveform?: string | null; // generated SVG waveform preview
  disabled?: boolean; // track unavailable, skip during playback
}
