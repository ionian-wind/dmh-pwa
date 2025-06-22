import type { WithMetadata, UUID as GlobalUUID, Timestamp, WithId, WithTimestamps } from '@/types';

export type UUID = GlobalUUID;

export interface JukeboxPlaylist extends WithId, WithTimestamps, WithMetadata {
  name: string;
  description?: string;
  trackIds: UUID[];
  sortOrder?: number;
  moduleIds?: string[];
}

export interface JukeboxFile extends WithId, WithTimestamps, WithMetadata {
  id: UUID;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  handle: FileSystemFileHandle;
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
  // Add more fields as needed for extracted metadata
} 