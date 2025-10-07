import type { WithMetadata } from '@/types';
import type { ImageMetadata } from './utils/imageWorker';

export interface MapPoint {
  // TODO: Define the structure for map points (coordinates, label, etc.)
  [key: string]: unknown;
}

export interface MapFile extends WithMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  handle: FileSystemFileHandle;
  imageMetadata?: ImageMetadata;
}

export interface MapEntity extends WithMetadata {
  title: string;
  description?: string;
  fileId: string; // Reference to MapFile
  points: MapPoint[];
} 
