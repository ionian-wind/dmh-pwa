import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import MapView from '@/maps/views/MapView.vue';
import { MapActionsControl } from '@/maps/plugins/MapActionsControl';
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
  locationStore: {
    isLoaded: true,
    items: [] as any[],
    getById: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
  },
  getMapFile: vi.fn(),
  getMapFileBlob: vi.fn(),
}));

vi.mock('@/maps/maps', () => ({
  useMapStore: () => mocks.mapStore,
  getMapFile: mocks.getMapFile,
}));

vi.mock('@/maps/locations', () => ({
  useMapLocationStore: () => mocks.locationStore,
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

const mapHarness = {
  map: null as any,
  controls: [] as any[],
};

const OlMapStub = defineComponent({
  name: 'OlMap',
  emits: ['click'],
  setup(_, { slots, emit, expose }) {
    const listeners = new Map<string, Set<(event: any) => void>>();
    const map: any = {
      addControl: vi.fn((control: any) => {
        mapHarness.controls.push(control);
        control.setMap(map);
      }),
      removeControl: vi.fn((control: any) => {
        const index = mapHarness.controls.indexOf(control);
        if (index >= 0) mapHarness.controls.splice(index, 1);
        control.setMap(null);
      }),
      on: vi.fn((type: string, handler: (event: any) => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(handler);
      }),
      un: vi.fn((type: string, handler: (event: any) => void) => {
        listeners.get(type)?.delete(handler);
      }),
      dispatchEvent: vi.fn((event: any) => {
        listeners.get(event.type)?.forEach((handler) => handler(event));
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getViewport: () => document.createElement('div'),
      getOverlayContainerStopEvent: () => document.createElement('div'),
      getOverlayContainer: () => document.createElement('div'),
      getCoordinateFromPixel: () => [50, 60],
      forEachFeatureAtPixel: vi.fn(() => null),
      render: vi.fn(),
    };
    mapHarness.map = map;
    expose({ map });
    return () =>
      h(
        'div',
        {
          class: 'ol-map-stub',
          onClick: (event: MouseEvent) =>
            emit('click', { pixel: [10, 20], coordinate: [50, 60], event }),
        },
        slots.default?.(),
      );
  },
});

const ContextMenuStub = defineComponent({
  name: 'OlContextMenuControl',
  props: {
    items: Array,
    defaultItems: Boolean,
    width: Number,
  },
  emits: ['open', 'close', 'beforeopen'],
  setup(_, { expose }) {
    const control = { closeMenu: vi.fn() };
    expose({ control });
    return () => h('div', { class: 'ol-context-menu-stub' });
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
  props: { areas: Array, showTitle: Boolean },
  emits: ['select-area', 'edit', 'delete', 'hover'],
  setup() {
    return () => h('div', { class: 'areas-panel-stub' });
  },
});

const MarkersPanelStub = defineComponent({
  name: 'MapMarkersPanel',
  props: { markers: Array },
  emits: ['select-marker', 'edit', 'delete', 'hover'],
  setup() {
    return () => h('div', { class: 'markers-panel-stub' });
  },
});

const location = {
  id: 'l1',
  name: 'Town',
  description: '',
  color: '#336699',
  entities: [],
  createdAt: 1,
  updatedAt: 1,
};

const map: MapEntity = {
  id: 'map1',
  title: 'World',
  description: 'Campaign',
  fileId: 'file1',
  locationId: 'l1',
  layers: [{ id: 'base', title: 'Base' }],
  markers: [
    {
      id: 'm1',
      title: 'Castle',
      x: 10,
      y: 20,
      locationId: 'l1',
      layerId: 'base',
      entities: [],
      icon: 'ra-castle-emblem',
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
      locationId: null,
      layerId: 'base',
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
        'ol-context-menu-control': ContextMenuStub,
        'ol-zoomslider-control': PassthroughStub,
        'ol-vector-layer': PassthroughStub,
        'ol-source-vector': PassthroughStub,
        'ol-feature': PassthroughStub,
        'ol-geom-polygon': PassthroughStub,
        'ol-geom-circle': PassthroughStub,
        'ol-geom-point': PassthroughStub,
        'ol-interaction-draw': PassthroughStub,
      },
      stubs: {
        BaseEntityView: BaseEntityViewStub,
        MapEditor: MapEditorStub,
        MapMarkerEditor: MarkerEditorStub,
        MapAreaEditor: AreaEditorStub,
        MapMarkersPanel: MarkersPanelStub,
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
    mapHarness.map = null;
    mapHarness.controls.length = 0;
    mocks.mapStore.isLoaded = true;
    mocks.mapStore.getById.mockReturnValue(map);
    mocks.locationStore.items = [location];
    mocks.locationStore.getById.mockImplementation((id: string) =>
      id === location.id ? location : undefined,
    );
    mocks.mapStore.update.mockImplementation(
      async (_id: string, patch: any) => ({
        ...map,
        ...patch,
      }),
    );
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

  it('loads the base image and renders markers in the sidebar', async () => {
    const wrapper = await mountMapView();

    expect(mocks.getMapFile).toHaveBeenCalledWith('file1');
    expect(wrapper.find('.ol-map-stub').exists()).toBe(true);
    expect(wrapper.find('.map-marker-accessible').exists()).toBe(true);
    expect(wrapper.findComponent(MarkersPanelStub).props('markers')).toEqual([
      expect.objectContaining({ id: 'm1', title: 'Castle' }),
    ]);
    expect(wrapper.findComponent(MarkerEditorStub).exists()).toBe(true);
    wrapper.unmount();
  });

  it('uses marker and area sidebar tabs without top tabs', async () => {
    const wrapper = await mountMapView();

    expect(wrapper.find('.map-top-tabs').exists()).toBe(false);
    expect(wrapper.text()).toContain('Markers');
    expect(wrapper.text()).toContain('Areas');
    expect(wrapper.findComponent(MarkersPanelStub).exists()).toBe(true);
    expect(wrapper.findComponent(AreasPanelStub).exists()).toBe(true);

    wrapper.unmount();
  });

  it('shows info popups for markers and areas instead of opening editors', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    await wrapper.find('.map-marker-accessible').trigger('click');
    expect(wrapper.find('.map-info-popup').exists()).toBe(true);
    expect(wrapper.find('.map-info-title').text()).toContain('Castle');
    expect(wrapper.find('.map-info-actions').text()).toContain(
      'Go to location',
    );
    expect(wrapper.findComponent(MarkerEditorStub).props('isOpen')).toBe(false);

    mapHarness.map.forEachFeatureAtPixel.mockReturnValueOnce({
      get: (key: string) => (key === 'markerId' ? 'm1' : undefined),
    });
    vm.closeMapInfo();
    vm.onMapClick({ pixel: [1, 1], coordinate: [50, 50] });
    await flushPromises();
    expect(wrapper.find('.map-info-title').text()).toContain('Castle');

    vm.closeMapInfo();
    vm.showAreaInfo(map.areas[0]);
    await flushPromises();
    expect(wrapper.find('.map-info-popup').exists()).toBe(true);
    expect(wrapper.find('.map-info-title').text()).toContain('Forest');
    expect(wrapper.findComponent(AreaEditorStub).props('isOpen')).toBe(false);

    wrapper.unmount();
  });

  it('highlights map items when their sidebar rows are hovered', async () => {
    const wrapper = await mountMapView();
    const markerButton = wrapper.find('.map-marker-accessible');
    expect(markerButton.classes()).not.toContain('is-hovered');

    const markerFeature = {
      get: (key: string) => (key === 'markerId' ? 'm1' : undefined),
    };
    const idleStyle = (wrapper.vm as any).markerStyle(markerFeature)[0];
    expect(idleStyle.getText().getStroke()).toBeNull();

    wrapper.findComponent(MarkersPanelStub).vm.$emit('hover', 'm1');
    await flushPromises();
    expect(wrapper.find('.map-marker-accessible').classes()).toContain(
      'is-hovered',
    );
    const hoveredStyle = (wrapper.vm as any).markerStyle(markerFeature)[0];
    expect(hoveredStyle.getText().getStroke().getColor()).toBe('#ffffff');

    wrapper.findComponent(MarkersPanelStub).vm.$emit('hover', null);
    wrapper.findComponent(AreasPanelStub).vm.$emit('hover', 'a1');
    await flushPromises();
    const styles = (wrapper.vm as any).areaStyle({ get: () => 'a1' });
    expect(Array.isArray(styles)).toBe(true);
    expect(styles).toHaveLength(2);

    wrapper.unmount();
  });

  it('does not open the map info popup when a sidebar item is clicked', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    vm.selectMarker('m1');
    await flushPromises();
    expect(wrapper.find('.map-info-popup').exists()).toBe(false);
    expect(vm.hoveredMarkerId).toBe('m1');

    vm.focusArea('a1');
    await flushPromises();
    expect(wrapper.find('.map-info-popup').exists()).toBe(false);
    expect(vm.hoveredAreaId).toBe('a1');

    wrapper.unmount();
  });

  it('places a marker from a map click and saves it', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    vm.isEditMode = true;
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

  it('toggles view/edit mode and layer visibility', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    const actionsControl = mapHarness.controls.find(
      (control) => control instanceof MapActionsControl,
    ) as MapActionsControl;
    expect(actionsControl.getElement().style.display).toBe('none');
    expect(wrapper.find('.map-layer-add').exists()).toBe(false);
    expect(wrapper.find('.map-marker-accessible').exists()).toBe(true);

    expect(wrapper.find('.map-area-label').exists()).toBe(true);
    vm.hideLabels = true;
    await flushPromises();
    expect(wrapper.find('.map-area-label').exists()).toBe(false);
    const hiddenLabelStyles = vm.markerStyle({
      get: (key: string) => (key === 'markerId' ? 'm1' : undefined),
    });
    expect(hiddenLabelStyles).toHaveLength(1);

    vm.hideLabels = false;
    await flushPromises();
    expect(wrapper.find('.map-area-label').exists()).toBe(true);

    vm.toggleLayerVisibility('base');
    await flushPromises();
    expect(vm.isLayerHidden('base')).toBe(true);
    expect(wrapper.find('.map-marker-accessible').exists()).toBe(false);

    vm.isEditMode = true;
    await flushPromises();
    expect(actionsControl.getElement().style.display).toBe('');
    expect(wrapper.find('.map-layer-add').exists()).toBe(true);
    expect(wrapper.find('.map-marker-accessible').exists()).toBe(true);

    wrapper.unmount();
  });

  it('exposes actions through OpenLayers controls and dispatches dialog events', async () => {
    const wrapper = await mountMapView();

    const actionsControl = mapHarness.controls.find(
      (control) => control instanceof MapActionsControl,
    ) as MapActionsControl | undefined;
    expect(actionsControl).toBeTruthy();

    const element = actionsControl!.getElement();
    const trigger = element.querySelector(
      '.ol-map-actions-trigger',
    ) as HTMLButtonElement;
    const menu = element.querySelector(
      '.ol-map-actions-menu',
    ) as HTMLDivElement;
    trigger.click();
    expect(menu.hidden).toBe(false);

    const toolbarAdd = element.querySelector(
      '[data-action="add-marker"]',
    ) as HTMLButtonElement;
    expect(toolbarAdd.querySelector('.ra')).toBeNull();
    toolbarAdd.click();
    expect((wrapper.vm as any).isAddingMarker).toBe(true);
    expect(menu.hidden).toBe(true);

    const contextItems = (wrapper.vm as any).contextMenuItems as any[];
    contextItems[0].callback({ coordinate: [50, 60] }, mapHarness.map);
    await flushPromises();

    expect(
      wrapper.findComponent(MarkerEditorStub).props('marker'),
    ).toMatchObject({ x: 50, y: 40 });

    contextItems[2].items[0].callback({ coordinate: [50, 60] }, mapHarness.map);
    await flushPromises();
    expect((wrapper.vm as any).drawMode).toBe('polygon');

    wrapper.unmount();
  });

  it('draws, saves, edits and deletes areas', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    vm.isEditMode = true;
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

    expect(wrapper.findComponent(AreasPanelStub).props('areas')).toHaveLength(
      1,
    );
    wrapper.unmount();
  });

  it('converts circle and square draw geometries', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    vm.isEditMode = true;
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
