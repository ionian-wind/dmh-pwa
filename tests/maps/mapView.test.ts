import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import MapView from '@/maps/views/MapView.vue';
import type { MapEntity } from '@/maps/types';

const mocks = vi.hoisted(() => ({
  mapStore: {
    isLoaded: true,
    items: { value: [] as any[] },
    getById: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
    update: vi.fn(),
    remove: vi.fn().mockResolvedValue(undefined),
  },
  getMapFile: vi.fn(),
  getMapFileBlob: vi.fn(),
}));

vi.mock('@/maps/maps', () => ({
  useMapStore: () => mocks.mapStore,
  getMapFile: mocks.getMapFile,
}));

vi.mock('@/maps/utils/mapFileUtils', () => ({
  getMapFileBlob: mocks.getMapFileBlob,
  revokeMapFileUrl: vi.fn(),
}));

const BaseEntityViewStub = defineComponent({
  name: 'BaseEntityView',
  setup(_, { slots }) {
    return () =>
      h('div', { class: 'entity-view-stub' }, [
        slots.default?.(),
        slots.sidepanel?.(),
        slots.actions?.(),
        slots.editor?.(),
      ]);
  },
});

const OlMapStub = defineComponent({
  name: 'OlMap',
  emits: ['click', 'contextmenu'],
  setup(_, { slots, emit }) {
    return () =>
      h(
        'div',
        {
          class: 'ol-map-stub',
          onClick: (event: MouseEvent) =>
            emit('click', { pixel: [10, 20], coordinate: [50, 60], event }),
          onContextmenu: (event: MouseEvent) =>
            emit('contextmenu', {
              pixel: [10, 20],
              coordinate: [50, 60],
              originalEvent: event,
            }),
        },
        slots.default?.(),
      );
  },
});

const PassthroughStub = defineComponent({
  name: 'Passthrough',
  setup(_, { slots }) {
    return () => h('div', slots.default?.());
  },
});

const MapEditorStub = defineComponent({
  name: 'MapEditor',
  props: { isOpen: Boolean, map: Object },
  emits: ['submit', 'cancel'],
  setup() {
    return () => h('div', { class: 'map-editor-stub' });
  },
});

const MarkerEditorStub = defineComponent({
  name: 'MapMarkerEditor',
  props: { isOpen: Boolean, marker: Object, locations: Array },
  emits: ['save', 'delete', 'cancel'],
  setup(props) {
    return () =>
      h('div', {
        class: 'marker-editor-stub',
        'data-open': String(props.isOpen),
        'data-x': (props.marker as any)?.x,
        'data-y': (props.marker as any)?.y,
      });
  },
});

const AreaEditorStub = defineComponent({
  name: 'MapAreaEditor',
  props: { isOpen: Boolean, area: Object, areas: Array },
  emits: ['save', 'delete', 'cancel'],
  setup(props) {
    return () =>
      h('div', {
        class: 'area-editor-stub',
        'data-open': String(props.isOpen),
        'data-shape': (props.area as any)?.shape,
      });
  },
});

const AreasPanelStub = defineComponent({
  name: 'MapAreasPanel',
  props: { areas: Array },
  emits: ['select-area'],
  setup() {
    return () => h('div', { class: 'areas-panel-stub' });
  },
});

const LocationsPanelStub = defineComponent({
  name: 'MapLocationsPanel',
  props: { locations: Array, markers: Array },
  emits: ['select-location'],
  setup() {
    return () => h('div', { class: 'locations-panel-stub' });
  },
});

const map: MapEntity = {
  id: 'map1',
  title: 'World',
  description: 'Campaign',
  fileId: 'file1',
  locations: [{ id: 'l1', name: 'Town', entities: [] }],
  markers: [
    {
      id: 'm1',
      title: 'Castle',
      x: 10,
      y: 20,
      locationId: 'l1',
      entities: [],
      icon: 'ra-castle',
      color: '#cc3333',
    },
  ],
  areas: [
    {
      id: 'a1',
      title: 'Forest',
      shape: 'polygon',
      points: [
        [0, 0],
        [30, 0],
        [30, 30],
      ],
      entities: [],
      linkedAreaIds: [],
      icon: '',
      color: '#336699',
    },
  ],
  createdAt: 1,
  updatedAt: 2,
};

async function mountMapView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/maps', component: { render: () => h('div') } },
      { path: '/maps/:id', component: { render: () => h('div') } },
    ],
  });
  await router.push('/maps/map1');
  await router.isReady();

  const wrapper = mount(MapView, {
    global: {
      plugins: [router],
      components: {
        'ol-map': OlMapStub,
        'ol-view': PassthroughStub,
        'ol-image-layer': PassthroughStub,
        'ol-source-image-static': PassthroughStub,
        'ol-overlay': PassthroughStub,
        'ol-zoom-control': PassthroughStub,
        'ol-zoomslider-control': PassthroughStub,
        'ol-vector-layer': PassthroughStub,
        'ol-source-vector': PassthroughStub,
        'ol-feature': PassthroughStub,
        'ol-geom-polygon': PassthroughStub,
        'ol-geom-circle': PassthroughStub,
        'ol-interaction-draw': PassthroughStub,
      },
      stubs: {
        BaseEntityView: BaseEntityViewStub,
        MapEditor: MapEditorStub,
        MapMarkerEditor: MarkerEditorStub,
        MapAreaEditor: AreaEditorStub,
        MapLocationsPanel: LocationsPanelStub,
        MapAreasPanel: AreasPanelStub,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('MapView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mapStore.isLoaded = true;
    mocks.mapStore.getById.mockReturnValue(map);
    mocks.mapStore.update.mockImplementation(async (_id: string, patch: any) => ({
      ...map,
      ...patch,
    }));
    mocks.getMapFile.mockResolvedValue({
      id: 'file1',
      name: 'world.png',
      source: { kind: 'blob', blob: new Blob(['image']) },
      imageMetadata: { width: 200, height: 100, aspectRatio: 2 },
    });
    mocks.getMapFileBlob.mockResolvedValue(new Blob(['image']));
    (URL as any).createObjectURL = vi.fn(() => 'blob:map-image');
    (URL as any).revokeObjectURL = vi.fn();
  });

  it('loads the base image and renders markers and locations', async () => {
    const wrapper = await mountMapView();

    expect(mocks.getMapFile).toHaveBeenCalledWith('file1');
    expect(wrapper.find('.ol-map-stub').exists()).toBe(true);
    expect(wrapper.find('.map-marker-button').exists()).toBe(true);
    expect(
      wrapper.findComponent(LocationsPanelStub).props('locations'),
    ).toEqual([
      expect.objectContaining({ id: 'l1', name: 'Town', entities: [] }),
    ]);
    expect(wrapper.findComponent(MarkerEditorStub).exists()).toBe(true);
    wrapper.unmount();
  });

  it('places a marker from a map click and saves it', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    vm.startAddMarker();
    wrapper.find('.ol-map-stub').trigger('click');
    await flushPromises();

    const editor = wrapper.findComponent(MarkerEditorStub);
    expect(editor.props('isOpen')).toBe(true);
    expect(editor.props('marker')).toMatchObject({ x: 50, y: 40 });

    editor.vm.$emit('save', {
      ...(editor.props('marker') as any),
      title: 'New marker',
    });
    await flushPromises();

    expect(mocks.mapStore.update).toHaveBeenCalledWith(
      'map1',
      expect.objectContaining({
        markers: expect.arrayContaining([
          expect.objectContaining({ title: 'New marker' }),
        ]),
      }),
    );
    wrapper.unmount();
  });

  it('edits and deletes markers and opens the map editor', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    vm.editMarker(map.markers[0]);
    await flushPromises();
    const editor = wrapper.findComponent(MarkerEditorStub);
    expect(editor.props('marker')).toEqual(map.markers[0]);

    editor.vm.$emit('save', { ...map.markers[0], title: 'Renamed' });
    await flushPromises();
    expect(mocks.mapStore.update).toHaveBeenCalledWith(
      'map1',
      expect.objectContaining({
        markers: [expect.objectContaining({ title: 'Renamed' })],
      }),
    );

    editor.vm.$emit('delete', 'm1');
    await flushPromises();
    expect(mocks.mapStore.update).toHaveBeenLastCalledWith('map1', {
      markers: [],
    });

    vm.openMapEditor();
    await flushPromises();
    expect(wrapper.findComponent(MapEditorStub).props('isOpen')).toBe(true);
    wrapper.unmount();
  });

  it('exposes actions from a single menu and a map context menu', async () => {
    const wrapper = await mountMapView();

    expect(wrapper.find('.map-actions-control').exists()).toBe(true);
    await wrapper.find('.map-actions-trigger').trigger('click');
    expect(wrapper.find('.map-actions-menu').exists()).toBe(true);

    const toolbarAdd = wrapper
      .findAll('.map-actions-menu button')
      .find((button) => button.text().toLowerCase().includes('add marker'));
    await toolbarAdd!.trigger('click');
    expect((wrapper.vm as any).isAddingMarker).toBe(true);
    expect(wrapper.find('.map-actions-menu').exists()).toBe(false);

    await wrapper.find('.ol-map-stub').trigger('contextmenu');
    expect(wrapper.find('.map-context-menu').exists()).toBe(true);

    const contextAdd = wrapper
      .findAll('.map-context-menu button')
      .find((button) => button.text().toLowerCase().includes('add marker'));
    await contextAdd!.trigger('click');
    await flushPromises();

    expect(wrapper.findComponent(MarkerEditorStub).props('marker')).toMatchObject(
      { x: 50, y: 40 },
    );
    expect(wrapper.find('.map-context-menu').exists()).toBe(false);
    wrapper.unmount();
  });

  it('centres on a selected location', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;
    vm.focusLocation('l1');
    await flushPromises();
    expect(vm.center).toEqual([10, 80]);
    wrapper.unmount();
  });

  it('draws, saves, edits and deletes areas', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    vm.startDrawArea('polygon');
    expect(vm.drawMode).toBe('polygon');

    vm.onAreaDrawn({
      feature: {
        getGeometry: () => ({
          getCoordinates: () => [
            [
              [0, 0],
              [50, 0],
              [50, 50],
              [0, 0],
            ],
          ],
        }),
      },
    });
    await flushPromises();

    const editor = wrapper.findComponent(AreaEditorStub);
    expect(editor.props('isOpen')).toBe(true);
    expect(editor.props('area')).toMatchObject({
      shape: 'polygon',
      points: [
        [0, 100],
        [50, 100],
        [50, 50],
      ],
    });

    editor.vm.$emit('save', {
      ...(editor.props('area') as any),
      title: 'New area',
    });
    await flushPromises();
    expect(mocks.mapStore.update).toHaveBeenCalledWith(
      'map1',
      expect.objectContaining({
        areas: expect.arrayContaining([
          expect.objectContaining({ title: 'New area' }),
        ]),
      }),
    );

    vm.editArea(map.areas[0]);
    await flushPromises();
    expect(wrapper.findComponent(AreaEditorStub).props('area')).toEqual(
      map.areas[0],
    );

    editor.vm.$emit('delete', 'a1');
    await flushPromises();
    expect(mocks.mapStore.update).toHaveBeenLastCalledWith(
      'map1',
      expect.objectContaining({
        areas: [expect.objectContaining({ title: 'New area' })],
      }),
    );

    expect(
      wrapper.findComponent(AreasPanelStub).props('areas'),
    ).toHaveLength(1);
    wrapper.unmount();
  });

  it('converts circle and square draw geometries', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    vm.startDrawArea('circle');
    vm.onAreaDrawn({
      feature: {
        getGeometry: () => ({
          getCenter: () => [100, 40],
          getRadius: () => 40,
        }),
      },
    });
    await flushPromises();
    expect(wrapper.findComponent(AreaEditorStub).props('area')).toMatchObject({
      shape: 'circle',
      center: [100, 60],
      radius: 40,
    });

    vm.startDrawArea('square');
    vm.onAreaDrawn({
      feature: {
        getGeometry: () => ({
          getCoordinates: () => [
            [
              [10, 10],
              [40, 10],
              [40, 40],
              [10, 40],
              [10, 10],
            ],
          ],
        }),
      },
    });
    await flushPromises();
    expect(wrapper.findComponent(AreaEditorStub).props('area')).toMatchObject({
      shape: 'square',
      points: expect.arrayContaining([
        [10, 90],
        [40, 60],
      ]),
    });
    wrapper.unmount();
  });
});
