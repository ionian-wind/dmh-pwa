import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MARKER_COLOR,
  DEFAULT_MARKER_ICON,
  normalizeArea,
  normalizeLocation,
  normalizeMapEntity,
  normalizeMarker,
} from '@/utils/maps/normalize';
import { markerIconClass, markerIconGlyph } from '@/utils/maps/icons';
import {
  createMarkerDraft,
  markerCenter,
  markersForLocation,
  removeMarker,
  upsertMarker,
} from '@/maps/utils/mapMarkers';
import {
  areaCenter,
  areaFillColor,
  areaTextColor,
  createAreaDraft,
  removeArea,
  upsertArea,
} from '@/maps/utils/mapAreas';
import { removeLocation, upsertLocation } from '@/maps/utils/mapLocations';
import { contrastTextColor, parseHexColor } from '@/maps/utils/colors';
import {
  imageToMapPoint,
  imageToMapPoints,
  mapToImagePoint,
  mapToImagePoints,
} from '@/maps/utils/mapCoordinates';
import {
  MAP_ENTITY_KIND_OPTIONS,
  dedupeEntityRefs,
  entityRefKey,
  getEntityKindOption,
} from '@/components/common/entityLinking/entityRefs';
import type { MapArea, MapMarker } from '@/maps/types';

function marker(overrides: Partial<MapMarker> = {}): MapMarker {
  return {
    id: 'm1',
    title: 'Marker',
    x: 10,
    y: 20,
    locationId: 'l1',
    entities: [],
    icon: 'ra-castle',
    color: '#ff0000',
    ...overrides,
  };
}

describe('map normalization', () => {
  it('fills marker defaults and preserves valid values', () => {
    const normalized = normalizeMarker({ id: 'm1', x: 4, y: 8 });

    expect(normalized).toMatchObject({
      id: 'm1',
      title: '',
      x: 4,
      y: 8,
      icon: DEFAULT_MARKER_ICON,
      color: DEFAULT_MARKER_COLOR,
      backgroundColor: '',
      entities: [],
    });
    expect(normalized.locationId).toBeNull();

    expect(
      normalizeMarker({
        id: 'm2',
        x: 1,
        y: 2,
        icon: 'ra-sword',
        color: '#fff',
        backgroundColor: '#123456',
        entities: [{ kind: 'note', id: 'n1' }],
        locationId: 'l1',
      }),
    ).toMatchObject({
      icon: 'ra-sword',
      color: '#fff',
      backgroundColor: '#123456',
      entities: [{ kind: 'note', id: 'n1' }],
      locationId: 'l1',
    });
  });

  it('normalizes locations and converts legacy points to markers', () => {
    const map = normalizeMapEntity({
      id: 'map1',
      title: 'World',
      fileId: 'file1',
      locations: [{ id: 'l1', name: 'Town' }],
      points: [
        { x: 10, y: 20, title: 'Old point', label: 'Ignored' },
        { x: 30, y: 40 },
        { label: 'No coordinates' },
      ],
      createdAt: 1,
      updatedAt: 2,
    } as any);

    expect(map.locationId).toEqual('l1');
    expect(map.markers).toHaveLength(2);
    expect(map.markers[0]).toMatchObject({ x: 10, y: 20, title: 'Old point' });
    expect(map.markers[1]).toMatchObject({ x: 30, y: 40 });
    expect(map.points).toBeUndefined();
  });

  it('preserves entity links on a map', () => {
    const map = normalizeMapEntity({
      id: 'map1',
      title: 'World',
      fileId: 'file1',
      entities: [{ kind: 'note', id: 'n1' }],
      createdAt: 1,
      updatedAt: 2,
    } as any);

    expect(map.entities).toEqual([{ kind: 'note', id: 'n1' }]);
  });

  it('prefers existing markers over legacy points', () => {
    const map = normalizeMapEntity({
      id: 'map1',
      title: 'World',
      fileId: 'file1',
      locations: [],
      markers: [marker()],
      points: [{ x: 1, y: 1 }],
    } as any);

    expect(map.markers).toHaveLength(1);
    expect(map.markers[0].id).toBe('m1');
  });
});

describe('map location helpers', () => {
  const location = {
    id: 'l1',
    name: 'Town',
    description: '',
    entities: [],
  };

  it('upserts new and existing locations', () => {
    expect(upsertLocation([], location)).toEqual([location]);

    const updated = upsertLocation([location], {
      ...location,
      name: 'Capital',
    });
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Capital');

    const added = upsertLocation(updated, { ...location, id: 'l2' });
    expect(added.map((entry) => entry.id)).toEqual(['l1', 'l2']);
  });

  it('removes locations by id', () => {
    expect(
      removeLocation([location, { ...location, id: 'l2' }], 'l1').map(
        (entry) => entry.id,
      ),
    ).toEqual(['l2']);
  });
});

describe('map marker helpers', () => {
  it('creates a draft with overrides', () => {
    const draft = createMarkerDraft(12, 34, {
      title: 'Camp',
      locationId: 'l1',
      entities: [{ kind: 'map', id: 'map2' }],
    });

    expect(draft).toMatchObject({
      x: 12,
      y: 34,
      title: 'Camp',
      locationId: 'l1',
      entities: [{ kind: 'map', id: 'map2' }],
      icon: DEFAULT_MARKER_ICON,
      color: DEFAULT_MARKER_COLOR,
    });
    expect(draft.id).toBeTruthy();
  });

  it('resolves RPG Awesome icon glyphs', () => {
    expect(markerIconGlyph('ra:ra-castle-emblem')).toBeTruthy();
    expect(markerIconGlyph('ra-castle-emblem')).toBeTruthy();
    expect(markerIconGlyph('')).toBe('');
    expect(markerIconGlyph('ra:')).toBe('');
  });

  it('normalizes icon names and trims empty values', () => {
    expect(markerIconClass('  ')).toBe('');
    expect(markerIconClass('ra:')).toBe('');
    expect(markerIconClass('shield')).toBe('ra-shield');
    expect(markerIconClass('ra-sword')).toBe('ra-sword');
  });

  it('upserts, removes and filters markers', () => {
    const first = marker();
    const second = marker({ id: 'm2', locationId: undefined });

    const added = upsertMarker([first], second);
    expect(added.map((entry) => entry.id)).toEqual(['m1', 'm2']);

    const updated = upsertMarker(added, marker({ title: 'Updated' }));
    expect(updated).toHaveLength(2);
    expect(updated[0].title).toBe('Updated');

    expect(removeMarker(updated, 'm1').map((entry) => entry.id)).toEqual([
      'm2',
    ]);
    expect(markersForLocation(updated, 'l1')).toEqual([updated[0]]);
  });

  it('calculates a marker centroid', () => {
    expect(
      markerCenter([
        marker({ x: 0, y: 0 }),
        marker({ id: 'm2', x: 10, y: 20 }),
      ]),
    ).toEqual([5, 10]);
    expect(markerCenter([], [100, 200])).toEqual([100, 200]);
  });
});

describe('map area helpers', () => {
  function area(overrides: Partial<MapArea> = {}): MapArea {
    return {
      id: 'a1',
      title: 'Forest',
      shape: 'polygon',
      points: [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      entities: [],
      locationId: null,
      icon: '',
      color: '#336699',
      ...overrides,
    };
  }

  it('normalizes area defaults and geometry', () => {
    const normalized = normalizeArea({ id: 'a1', color: '#abc' });

    expect(normalized).toMatchObject({
      id: 'a1',
      title: '',
      shape: 'polygon',
      points: [],
      entities: [],
      locationId: null,
      color: '#abc',
    });

    const circle = normalizeArea({
      id: 'a2',
      shape: 'circle',
      center: [50, 60],
      radius: 25,
    });
    expect(circle).toMatchObject({
      shape: 'circle',
      center: [50, 60],
      radius: 25,
    });
  });

  it('creates, upserts and removes areas', () => {
    const draft = createAreaDraft(
      'square',
      {
        points: [
          [0, 0],
          [20, 0],
          [20, 20],
          [0, 20],
        ],
      },
      { title: 'Courtyard' },
    );

    expect(draft).toMatchObject({
      title: 'Courtyard',
      shape: 'square',
      points: expect.arrayContaining([[20, 20]]),
      icon: '',
    });
    expect(draft.id).toBeTruthy();

    const added = upsertArea([area()], draft);
    expect(added.map((entry) => entry.id)).toEqual(['a1', draft.id]);

    const updated = upsertArea(added, { ...draft, title: 'Renamed' });
    expect(updated).toHaveLength(2);
    expect(updated[1].title).toBe('Renamed');

    expect(removeArea(updated, draft.id).map((entry) => entry.id)).toEqual([
      'a1',
    ]);
  });

  it('converts between image pixels and map coordinates', () => {
    expect(imageToMapPoint([10, 20], 100)).toEqual([10, 80]);
    expect(mapToImagePoint([10, 80], 100)).toEqual([10, 20]);
    expect(
      imageToMapPoints(
        [
          [0, 0],
          [10, 20],
        ],
        100,
      ),
    ).toEqual([
      [0, 100],
      [10, 80],
    ]);
    expect(
      mapToImagePoints(
        [
          [0, 100],
          [10, 80],
        ],
        100,
      ),
    ).toEqual([
      [0, 0],
      [10, 20],
    ]);
  });

  it('calculates area centres and semi-transparent fills', () => {
    expect(areaCenter(area())).toEqual([20 / 3, 10 / 3]);
    expect(
      areaCenter(area({ shape: 'circle', center: [100, 50], radius: 10 })),
    ).toEqual([100, 50]);
    expect(areaCenter(area({ points: [] }), [5, 6])).toEqual([5, 6]);

    expect(areaFillColor('#336699', 0.25)).toBe('rgba(51, 102, 153, 0.25)');
    expect(areaFillColor('#abc', 0.5)).toBe('rgba(170, 187, 204, 0.5)');
    expect(areaFillColor('red', 0.5)).toBe('red');
    expect(areaTextColor('#336699')).toBe('#ffffff');
    expect(areaTextColor('#f8f8f8')).toBe('#111827');
    expect(areaTextColor('red')).toBe('#111827');
  });

  it('parses colours and picks a contrasting outline', () => {
    expect(parseHexColor('#abc')).toEqual([170, 187, 204]);
    expect(parseHexColor('#336699')).toEqual([51, 102, 153]);
    expect(parseHexColor('not-a-colour')).toBeNull();
    expect(contrastTextColor('#cc3333')).toBe('#ffffff');
    expect(contrastTextColor('#f8f8f8')).toBe('#111827');
    expect(contrastTextColor('currentColor')).toBe('#111827');
  });
});

describe('map entity references', () => {
  it('defines label keys for every supported entity kind', () => {
    expect(MAP_ENTITY_KIND_OPTIONS.map((option) => option.kind)).toEqual(
      expect.arrayContaining([
        'note',
        'party',
        'monster',
        'encounter',
        'character',
        'location',
        'playlist',
      ]),
    );
    expect(MAP_ENTITY_KIND_OPTIONS).toHaveLength(7);
    expect(getEntityKindOption('playlist')).toMatchObject({
      kind: 'playlist',
      labelKey: 'playlist.title',
      titleField: 'name',
    });
    expect(getEntityKindOption('location')).toMatchObject({
      kind: 'location',
      labelKey: 'maps.locations',
      titleField: 'name',
    });
    expect(getEntityKindOption('unknown')).toBeUndefined();
  });

  it('deduplicates refs by kind and id', () => {
    const refs = [
      { kind: 'note' as const, id: 'n1' },
      { kind: 'note' as const, id: 'n1' },
      { kind: 'monster' as const, id: 'n1' },
      { kind: 'map' as const, id: 'map1' },
    ];

    expect(entityRefKey(refs[0])).toBe('note:n1');
    expect(dedupeEntityRefs(refs)).toEqual([
      { kind: 'note', id: 'n1' },
      { kind: 'monster', id: 'n1' },
      { kind: 'map', id: 'map1' },
    ]);
  });
});

describe('normalization defaults and legacy maps', () => {
  it('fills defaults for empty locations, markers and areas', () => {
    const location = normalizeLocation({});
    expect(location.id).toBeTruthy();
    expect(location.name).toBe('');
    expect(location.description).toBe('');
    expect(location.entities).toEqual([]);
    expect(normalizeMarker({}).layerId).toBe('base');
    expect(normalizeArea({}).shape).toBe('polygon');
    expect(normalizeArea({ shape: 'invalid' as any }).shape).toBe('polygon');
    expect(normalizeArea({ points: 'bad' as any }).points).toEqual([]);
    expect(normalizeMarker({ entities: 'bad' as any }).entities).toEqual([]);
    expect(normalizeLocation({ entities: null as any }).entities).toEqual([]);
  });

  it('normalizes legacy points, locations and invalid layers', () => {
    const map = normalizeMapEntity({
      points: [
        { x: 10, y: 20, label: 'Legacy' },
        { x: 'bad', y: 2 },
      ],
      locationIds: ['l1', 2],
      layers: [{ id: 'base', title: 'Base' }],
      areas: [],
    } as any);
    expect(map.markers[0].title).toBe('Legacy');
    expect(map.locationId).toBe('l1');

    const invalidLayers = normalizeMapEntity({
      layers: [{ id: 'base', title: 'Base' }],
      markers: [{ id: 'm1', layerId: 'missing' }],
      areas: [{ id: 'a1', layerId: 'missing', points: [[1, 2], ['bad']] }],
    } as any);
    expect(invalidLayers.markers[0].layerId).toBe('base');
    expect(invalidLayers.areas[0].layerId).toBe('base');

    const fromLocations = normalizeMapEntity({
      locations: [{ id: 'l2' }, { id: 3 }],
      markers: [],
      areas: [],
    } as any);
    expect(fromLocations.locationId).toBe('l2');
    const noLocations = normalizeMapEntity({ markers: [], areas: [] } as any);
    expect(noLocations.locationId).toBeNull();
    expect(noLocations.markers).toEqual([]);
    expect(noLocations.areas).toEqual([]);
  });
});
