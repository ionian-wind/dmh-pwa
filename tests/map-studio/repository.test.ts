import { describe, expect, it } from 'vitest';
import {
  createProjectWithMap,
  deleteMap,
  deleteProject,
  getMap,
  getProject,
  listMaps,
  listProjects,
  saveMap,
  saveProject,
  saveSnapshot,
  getLatestSnapshot,
} from '@/map-studio/persistence/repository';

describe('map studio repository', () => {
  it('creates, lists, updates and deletes a project with a map', async () => {
    const { project, map } = await createProjectWithMap('Dungeon');
    expect(project.mapOrder).toEqual([map.id]);

    expect((await listProjects()).map((entry) => entry.id)).toContain(
      project.id,
    );
    expect(await getProject(project.id)).toMatchObject({ name: 'Dungeon' });
    expect((await listMaps(project.id)).map((entry) => entry.id)).toEqual([
      map.id,
    ]);
    expect(await getMap(map.id)).toMatchObject({ name: 'Dungeon' });

    await saveMap({ ...map, name: 'Renamed' });
    expect((await getMap(map.id))?.name).toBe('Renamed');

    const updatedProject = {
      ...project,
      name: 'Updated',
      mapOrder: [...project.mapOrder, 'second'],
    };
    await saveProject(updatedProject);
    expect((await getProject(project.id))?.name).toBe('Updated');

    await deleteMap(map.id);
    expect(await getMap(map.id)).toBeNull();

    await deleteProject(project.id);
    expect(await getProject(project.id)).toBeNull();
  });

  it('stores and trims snapshots', async () => {
    const { map } = await createProjectWithMap('Snapshots');
    for (let index = 0; index < 12; index += 1) {
      await saveSnapshot({ ...map, name: `Snapshot ${index}` }, 'autosave');
    }
    const latest = await getLatestSnapshot(map.id);
    expect(latest?.document.name).toBe('Snapshot 11');
    const db = await import('@/utils/storage').then((module) =>
      module.openDB(),
    );
    const snapshots = await db
      .table('map_studio_snapshots')
      .where('mapId')
      .equals(map.id)
      .toArray();
    expect(snapshots).toHaveLength(10);
  });
});

describe('map studio repository extras', () => {
  it('stores thumbnails and removes snapshots with their map/project', async () => {
    const {
      createProjectWithMap,
      deleteMap,
      deleteProject,
      getMapThumbnail,
      saveMap,
      saveSnapshot,
    } = await import('@/map-studio/persistence/repository');
    const { project, map } = await createProjectWithMap('Thumbs');
    await saveMap(map, 'data:image/png;base64,abc');
    expect(await getMapThumbnail(map.id)).toBe('data:image/png;base64,abc');
    await saveSnapshot(map, 'manual');
    await deleteMap(map.id);
    const db = await import('@/utils/storage').then((module) =>
      module.openDB(),
    );
    expect(
      await db
        .table('map_studio_snapshots')
        .where('mapId')
        .equals(map.id)
        .count(),
    ).toBe(0);
    await deleteProject(project.id);
  });
});

describe('map studio repository missing records', () => {
  it('returns null/undefined for unknown ids', async () => {
    const { getMap, getMapThumbnail, getLatestSnapshot, getProject } =
      await import('@/map-studio/persistence/repository');
    expect(await getProject('missing')).toBeNull();
    expect(await getMap('missing')).toBeNull();
    expect(await getMapThumbnail('missing')).toBeUndefined();
    expect(await getLatestSnapshot('missing')).toBeNull();
  });
});
