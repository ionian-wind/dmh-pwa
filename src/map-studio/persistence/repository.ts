import { openDB } from '@/utils/storage';
import type {
  StudioMap,
  StudioProject,
} from '@/map-studio/domain/document/types';
import {
  normalizeMap,
  normalizeProject,
} from '@/map-studio/domain/document/normalize';
import {
  createMap,
  createProject,
} from '@/map-studio/domain/document/factories';

export interface MapRecord {
  id: string;
  projectId: string;
  updatedAt: number;
  document: StudioMap;
  thumbnail?: string;
}

export interface SnapshotRecord {
  id: string;
  projectId: string;
  mapId: string;
  createdAt: number;
  reason: 'autosave' | 'manual' | 'crash';
  document: StudioMap;
}

async function tables() {
  const db = await openDB();
  return {
    projects: db.table<any, string>('map_studio_projects'),
    maps: db.table<any, string>('map_studio_maps'),
    snapshots: db.table<any, string>('map_studio_snapshots'),
    settings: db.table<any, string>('map_studio_settings'),
  };
}

export async function listProjects(): Promise<StudioProject[]> {
  const { projects } = await tables();
  const records = await projects.toArray();
  return records
    .map((record) => normalizeProject(record))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<StudioProject | null> {
  const { projects } = await tables();
  const record = await projects.get(id);
  return record ? normalizeProject(record) : null;
}

export async function saveProject(project: StudioProject): Promise<void> {
  const { projects } = await tables();
  await projects.put({
    id: project.id,
    name: project.name,
    description: project.description ?? '',
    schemaVersion: project.schemaVersion,
    createdAt: project.createdAt,
    updatedAt: Date.now(),
    mapOrder: project.mapOrder,
    locationId: project.locationId ?? null,
    settings: project.settings,
  });
}

export async function deleteProject(id: string): Promise<void> {
  const { projects, maps, snapshots } = await tables();
  const records = await maps.where('projectId').equals(id).toArray();
  await Promise.all(records.map((record) => maps.delete(record.id)));
  const snaps = await snapshots.toArray();
  await Promise.all(
    snaps
      .filter((entry) => entry.projectId === id)
      .map((entry) => snapshots.delete(entry.id)),
  );
  await projects.delete(id);
}

export async function listMaps(projectId: string): Promise<StudioMap[]> {
  const { maps } = await tables();
  const records = await maps.where('projectId').equals(projectId).toArray();
  return records
    .map((record) => normalizeMap(record.document, projectId))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getMap(
  id: string,
  projectId?: string,
): Promise<StudioMap | null> {
  const { maps } = await tables();
  const record = await maps.get(id);
  if (!record) return null;
  return normalizeMap(record.document, projectId ?? record.projectId);
}

export async function saveMap(
  map: StudioMap,
  thumbnail?: string,
): Promise<void> {
  const { maps } = await tables();
  const document = { ...map, updatedAt: Date.now() };
  await maps.put({
    id: document.id,
    projectId: document.projectId,
    updatedAt: document.updatedAt,
    document,
    ...(thumbnail ? { thumbnail } : {}),
  });
}

export async function deleteMap(id: string): Promise<void> {
  const { maps, snapshots } = await tables();
  await maps.delete(id);
  const snaps = await snapshots.toArray();
  await Promise.all(
    snaps
      .filter((entry) => entry.mapId === id)
      .map((entry) => snapshots.delete(entry.id)),
  );
}

export async function saveSnapshot(
  map: StudioMap,
  reason: SnapshotRecord['reason'] = 'autosave',
): Promise<void> {
  const { snapshots } = await tables();
  await snapshots.put({
    id: `${map.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    projectId: map.projectId,
    mapId: map.id,
    createdAt: Date.now(),
    reason,
    document: map,
  });
  const entries = (await snapshots.toArray())
    .filter((entry) => entry.mapId === map.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  await Promise.all(
    entries.slice(10).map((entry) => snapshots.delete(entry.id)),
  );
}

export async function getLatestSnapshot(
  mapId: string,
): Promise<SnapshotRecord | null> {
  const { snapshots } = await tables();
  const entries = await snapshots.toArray();
  return (
    entries
      .filter((entry) => entry.mapId === mapId)
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  );
}

export async function createProjectWithMap(
  name = 'Untitled map',
): Promise<{ project: StudioProject; map: StudioMap }> {
  const project = createProject({ name });
  const map = createMap(project.id, { name });
  project.mapOrder = [map.id];
  await saveProject(project);
  await saveMap(map);
  return { project, map };
}

export async function getMapThumbnail(id: string): Promise<string | undefined> {
  const { maps } = await tables();
  const record = await maps.get(id);
  return record?.thumbnail;
}
