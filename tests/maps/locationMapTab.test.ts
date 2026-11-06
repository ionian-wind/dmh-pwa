import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, onMounted } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import MapView from '@/maps/components/LocationMapTab.vue';
import { MapActionsControl } from '@/maps/plugins/MapActionsControl';
import type { MapEntity } from '@/maps/types';

const mocks = vi.hoisted(() => ({
  locationStore: {
    isLoaded: true,
    items: [] as any[],
    getById: vi.fn(),
    update: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
  },
  getMapFile: vi.fn(),
  getMapFileBlob: vi.fn(),
  confirm: vi.fn(),
  prompt: vi.fn(),
}));

vi.mock('@/maps/maps', () => ({
  getMapFile: mocks.getMapFile,
}));

vi.mock('@/maps/locations', () => ({
  useMapLocationStore: () => mocks.locationStore,
}));

vi.mock('@/dialogs', () => ({
  confirm: mocks.confirm,
  prompt: mocks.prompt,
}));

vi.mock('@/maps/utils/mapFileUtils', () => ({
  getMapFileBlob: mocks.getMapFileBlob,
  revokeMapFileUrl: vi.fn(),
}));

const mapHarness = {
  map: null as any,
  controls: [] as any[],
  deferImageLoad: false,
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

const imageSourceEmitter = {
  loadEnd: null as null | (() => void),
};

const ImageSourceStub = defineComponent({
  name: 'OlSourceImageStatic',
  emits: ['imageloadstart', 'imageloadend', 'imageloaderror'],
  setup(_, { emit }) {
    imageSourceEmitter.loadEnd = () => emit('imageloadend');
    onMounted(() => {
      if (!mapHarness.deferImageLoad) emit('imageloadend');
    });
    return () => h('div', { class: 'ol-source-image-stub' });
  },
});

const VectorLayerStub = defineComponent({
  name: 'OlVectorLayer',
  props: { visible: { type: Boolean, default: true }, zIndex: Number },
  setup(_, { slots }) {
    return () => h('div', { class: 'ol-vector-layer-stub' }, slots.default?.());
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

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: {
    kind: String,
    modelValue: Array,
    readonly: Boolean,
  },
  setup() {
    return () => h('div', { class: 'entities-linking-stub' });
  },
});

const location = {
  id: 'l1',
  name: 'Town',
  description: '',
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
      backgroundColor: '#ffffff',
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

async function mountMapView(props: Record<string, unknown> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/locations', component: { render: () => h('div') } },
      { path: '/locations/:id', component: { render: () => h('div') } },
    ],
  });
  await router.push('/locations/map1');
  await router.isReady();

  const wrapper = mount(MapView, {
    props,
    global: {
      plugins: [router],
      components: {
        'ol-map': OlMapStub,
        'ol-view': PassthroughStub,
        'ol-image-layer': PassthroughStub,
        'ol-source-image-static': ImageSourceStub,
        'ol-overlay': PassthroughStub,
        'ol-zoom-control': PassthroughStub,
        'ol-context-menu-control': ContextMenuStub,
        'ol-zoomslider-control': PassthroughStub,
        'ol-vector-layer': VectorLayerStub,
        'ol-source-vector': PassthroughStub,
        'ol-feature': PassthroughStub,
        'ol-geom-polygon': PassthroughStub,
        'ol-geom-circle': PassthroughStub,
        'ol-geom-point': PassthroughStub,
        'ol-interaction-draw': PassthroughStub,
      },
      stubs: {
        teleport: true,
        MapMarkerEditor: MarkerEditorStub,
        MapAreaEditor: AreaEditorStub,
        MapMarkersPanel: MarkersPanelStub,
        MapAreasPanel: AreasPanelStub,
        EntitiesLinking: EntitiesLinkingStub,
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
    mapHarness.deferImageLoad = false;
    mocks.locationStore.isLoaded = true;
    mocks.locationStore.items = [location];
    mocks.locationStore.getById.mockImplementation((id: string) =>
      id === location.id ? location : map,
    );
    mocks.locationStore.update.mockImplementation(
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
    mocks.confirm.mockResolvedValue(true);
    mocks.prompt.mockResolvedValue('Layer 2');
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

  it('waits for the image before rendering layers', async () => {
    mapHarness.deferImageLoad = true;
    const wrapper = await mountMapView();

    expect(wrapper.find('[data-stub="QSpinner"]').exists()).toBe(true);
    expect(wrapper.find('.map-loading-overlay').exists()).toBe(true);
    expect(wrapper.find('.map-loading-overlay').classes()).not.toContain(
      'z-top',
    );
    expect(wrapper.findAll('.ol-vector-layer-stub')).toHaveLength(0);
    expect(wrapper.find('.map-marker-accessible').exists()).toBe(false);
    expect(wrapper.find('.map-area-label').exists()).toBe(false);

    imageSourceEmitter.loadEnd?.();
    await flushPromises();

    expect(wrapper.find('[data-stub="QSpinner"]').exists()).toBe(false);
    expect(wrapper.find('.map-loading-overlay').exists()).toBe(false);
    expect(wrapper.findAll('.ol-vector-layer-stub')).toHaveLength(1);
    expect(wrapper.find('.map-marker-accessible').exists()).toBe(true);
    expect(wrapper.find('.map-area-label').exists()).toBe(true);

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
    expect(wrapper.find('.map-info-anchor').exists()).toBe(true);
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

  it('shows linked entities in the marker popup without add or remove actions', async () => {
    map.markers[0].entities = [{ kind: 'note', id: 'n1' }];
    const wrapper = await mountMapView();

    await wrapper.find('.map-marker-accessible').trigger('click');
    const links = wrapper.findComponent(EntitiesLinkingStub);
    expect(links.exists()).toBe(true);
    expect(links.props('kind')).toBe('note');
    expect(links.props('modelValue')).toEqual([{ kind: 'note', id: 'n1' }]);
    expect(links.props('readonly')).toBe(true);

    map.markers[0].entities = [];
    wrapper.unmount();
  });

  it('highlights map items when their sidebar rows are hovered', async () => {
    const wrapper = await mountMapView();
    const markerButton = wrapper.find('.map-marker-accessible');
    expect(markerButton.classes()).not.toContain('is-hovered');

    const markerFeature = {
      get: (key: string) => (key === 'markerId' ? 'm1' : undefined),
    };
    const idleStyles = (wrapper.vm as any).markerStyle(markerFeature);
    const idleImage = idleStyles[0].getImage();
    expect(idleImage.getSrc()).toContain('data:image/svg+xml');
    const idleSvg = decodeURIComponent(idleImage.getSrc());
    expect(idleSvg).toContain('height="40"');
    expect(idleSvg).toContain('fill="#ffffff"');
    expect(idleStyles[1].getText().getStroke()).toBeNull();

    wrapper.findComponent(MarkersPanelStub).vm.$emit('hover', 'm1');
    await flushPromises();
    expect(wrapper.find('.map-marker-accessible').classes()).toContain(
      'is-hovered',
    );
    const hoveredStyles = (wrapper.vm as any).markerStyle(markerFeature);
    expect(decodeURIComponent(hoveredStyles[0].getImage().getSrc())).toContain(
      'height="46"',
    );
    expect(hoveredStyles[1].getText().getFont()).toContain('700');

    wrapper.findComponent(MarkersPanelStub).vm.$emit('hover', null);
    wrapper.findComponent(AreasPanelStub).vm.$emit('hover', 'a1');
    await flushPromises();
    const styles = (wrapper.vm as any).areaStyle({ get: () => 'a1' });
    expect(Array.isArray(styles)).toBe(true);
    expect(styles).toHaveLength(2);

    wrapper.unmount();
  });

  it('navigates to the linked location from the info popup', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;
    const router = wrapper.vm.$router;
    const push = vi.spyOn(router, 'push');

    vm.showMarkerInfo(map.markers[0]);
    await flushPromises();
    const goToLocation = wrapper
      .findAll('.map-info-actions button')
      .find((button) => button.text() === 'Go to location');
    expect(goToLocation).toBeTruthy();

    await goToLocation!.trigger('click');
    expect(push).toHaveBeenCalledWith('/locations/l1');
    wrapper.unmount();
  });

  it('covers list deletion, map editor and layer actions', async () => {
    const localMap = structuredClone(map);
    mocks.locationStore.getById.mockReturnValue(localMap);
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;
    const update = mocks.locationStore.update;
    update.mockImplementation(async (_id: string, patch: any) => ({
      ...localMap,
      ...patch,
    }));

    await vm.deleteMarkerFromList('m1');
    expect(update).toHaveBeenCalledWith('map1', {
      map: expect.objectContaining({ markers: [] }),
    });

    await vm.deleteAreaFromList('a1');
    expect(update).toHaveBeenCalledWith('map1', {
      map: expect.objectContaining({ areas: [] }),
    });

    localMap.layers = [
      { id: 'base', title: 'Base' },
      { id: 'layer-2', title: 'Layer 2' },
    ];
    vm.map = { ...localMap };
    await vm.addLayer();
    expect(update).toHaveBeenCalledWith(
      'map1',
      expect.objectContaining({
        map: expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({ title: 'Layer 2' }),
          ]),
        }),
      }),
    );

    mocks.prompt.mockResolvedValueOnce('Renamed layer');
    localMap.layers = [
      { id: 'base', title: 'Base' },
      { id: 'layer-2', title: 'Layer 2' },
    ];
    vm.map = { ...localMap };
    await vm.editLayer({ id: 'layer-2', title: 'Layer 2' });
    expect(update).toHaveBeenCalledWith(
      'map1',
      expect.objectContaining({
        map: expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({ title: 'Renamed layer' }),
          ]),
        }),
      }),
    );

    localMap.markers = [{ ...map.markers[0], layerId: 'layer-2' }];
    localMap.areas = [{ ...map.areas[0], layerId: 'layer-2' }];
    vm.map = { ...localMap };
    await vm.deleteLayer({ id: 'layer-2', title: 'Layer 2' });
    expect(update).toHaveBeenCalledWith(
      'map1',
      expect.objectContaining({
        map: expect.objectContaining({
          layers: [{ id: 'base', title: 'Base' }],
          markers: [expect.objectContaining({ layerId: 'base' })],
          areas: [expect.objectContaining({ layerId: 'base' })],
        }),
      }),
    );

    vm.toggleLayerVisibility('base');
    vm.toggleLayerVisibility('base');
    vm.showMarkerInfo(localMap.markers[0]);
    vm.toggleLayerVisibility('layer-2');
    vm.handleMapAction({ action: 'cancel-drawing' });
    vm.onContextMenuOpen();
    wrapper.unmount();
  });

  it('covers image, area, hover and info helpers', async () => {
    const localMap = structuredClone(map);
    localMap.areas.push({
      id: 'a2',
      title: 'Circle',
      shape: 'circle',
      points: [],
      center: [10, 10],
      radius: 5,
      entities: [],
      locationId: null,
      layerId: 'base',
      icon: '',
      color: '#336699',
    } as any);
    mocks.locationStore.getById.mockReturnValue(localMap);
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    vm.onImageLoadStart();
    expect(vm.imageLoaded).toBe(false);
    vm.onImageLoadEnd();
    expect(vm.imageLoaded).toBe(true);
    vm.onImageLoadError();
    expect(vm.imageLoadFailed).toBe(true);

    expect(vm.areaCircleMapCenter(localMap.areas[1])).toHaveLength(2);
    vm.hoverArea('a1');
    expect(vm.hoveredAreaId).toBe('a1');
    vm.hoverMarker('m1');
    expect(vm.hoveredMarkerId).toBe('m1');
    vm.selectMarker('m1');
    vm.focusArea('a1');
    vm.refreshAreaHighlight();

    vm.showMarkerInfo(localMap.markers[0]);
    vm.editInfoItem();
    expect(vm.isMarkerEditorOpen).toBe(true);
    vm.showAreaInfo(localMap.areas[0]);
    vm.editInfoItem();
    expect(vm.isAreaEditorOpen).toBe(true);

    mapHarness.map.forEachFeatureAtPixel.mockReturnValueOnce({
      get: (key: string) => (key === 'areaId' ? 'a1' : undefined),
    });
    vm.onMapClick({ pixel: [1, 1], coordinate: [20, 20] });
    await flushPromises();
    expect(vm.infoSelection).toEqual({ kind: 'area', id: 'a1' });

    vm.toggleLayerVisibility('base');
    vm.toggleLayerVisibility('base');
    wrapper.unmount();
  });

  it('marks the image as failed when the blob cannot be loaded', async () => {
    mocks.getMapFileBlob.mockRejectedValueOnce(new Error('missing blob'));
    const wrapper = await mountMapView();
    expect((wrapper.vm as any).imageLoadFailed).toBe(true);
    wrapper.unmount();
  });

  it('covers view, drawing, layer and missing-item branches', async () => {
    const localMap = structuredClone(map);
    localMap.layers.push({ id: 'layer-2', title: 'Layer 2' });
    mocks.locationStore.getById.mockReturnValue(localMap);
    mocks.locationStore.update.mockImplementation(
      async (_id: string, patch: any) => ({
        ...localMap,
        ...patch,
      }),
    );
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    expect(vm.markerStyle({ get: () => 'missing' })).toBeUndefined();
    expect(vm.areaStyle({ get: () => 'missing' })).toBeUndefined();
    expect(
      vm.mapFeatureStyle({
        get: (key: string) => (key === 'markerId' ? 'm1' : undefined),
      }),
    ).toBeTruthy();
    expect(
      vm.mapFeatureStyle({
        get: (key: string) => (key === 'areaId' ? 'a1' : undefined),
      }),
    ).toBeTruthy();

    vm.showLabels = false;
    await flushPromises();
    vm.showLabels = true;
    await flushPromises();
    vm.isEditMode = true;
    await flushPromises();
    vm.isEditMode = false;
    await flushPromises();

    vm.drawMode = 'polygon';
    await flushPromises();
    vm.cancelDrawing();
    expect(vm.drawMode).toBeNull();

    vm.editInfoItem();
    vm.selectMarker('missing');
    vm.focusArea('missing');
    vm.hoverArea(null);
    vm.hoverMarker(null);
    await vm.addLayer();
    await vm.editLayer({ id: 'base', title: 'Base' });
    await vm.deleteLayer({ id: 'base', title: 'Base' });
    await vm.deleteMarkerFromList('missing');
    await vm.deleteAreaFromList('missing');

    mocks.confirm.mockResolvedValueOnce(false);
    await vm.deleteMarkerFromList('m1');
    mocks.confirm.mockResolvedValueOnce(false);
    await vm.deleteAreaFromList('a1');
    mocks.confirm.mockResolvedValueOnce(false);
    await vm.deleteLayer({ id: 'layer-2', title: 'Layer 2' });

    vm.showMarkerInfo(localMap.markers[0]);
    vm.toggleLayerVisibility('base');
    expect(vm.infoSelection).toBeNull();
    vm.toggleLayerVisibility('base');

    vm.isEditMode = true;
    vm.isAddingMarker = true;
    vm.onMapClick({ pixel: [1, 1], coordinate: [20, 20] });
    await flushPromises();
    expect(vm.isMarkerEditorOpen).toBe(true);
    vm.closeMarkerEditor();

    vm.drawMode = 'freehand';
    vm.onAreaDrawn({
      feature: {
        getGeometry: () => ({
          getCoordinates: () => [
            [10, 20],
            [30, 40],
          ],
        }),
      },
    });
    vm.closeAreaEditor();
    vm.handleMapAction({ action: 'draw-area', shape: 'circle' });
    vm.handleMapAction({ action: 'cancel-drawing' });
    vm.handleMapAction({ action: 'add-marker', coordinate: [5, 5] });
    vm.closeMarkerEditor();

    vm.onMapClick({ pixel: [1, 1], coordinate: [20, 20] });
    vm.onMapClick({});
    wrapper.unmount();
  });

  it('handles missing map data and empty collections', async () => {
    mocks.locationStore.getById.mockReturnValue(undefined);
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    expect(vm.layers).toEqual([]);
    expect(vm.visibleMarkers).toEqual([]);
    expect(vm.visibleAreas).toEqual([]);
    expect(vm.markersForLayer('base')).toEqual([]);
    expect(vm.areasForLayer('base')).toEqual([]);
    expect(vm.infoEntities).toEqual([]);
    vm.goToInfoLocation();
    await vm.persistMarkers([]);
    await vm.saveMarker({ id: 'm1' });
    await vm.deleteMarker('m1');
    await vm.persistLayers([]);
    await vm.deleteArea('a1');
    await vm.saveArea({ id: 'a1' });
    await vm.deleteAreaFromList('a1');
    await vm.deleteMarkerFromList('m1');
    vm.onAreaDrawn({ feature: { getGeometry: () => ({}) } });
    vm.selectMarker('m1');
    vm.focusArea('a1');
    vm.closeAreaEditor();
    vm.closeMarkerEditor();
    wrapper.unmount();
  });

  it('handles empty map collections and draw mode variants', async () => {
    const localMap = structuredClone(map);
    localMap.markers = [];
    localMap.areas = [];
    localMap.layers = [];
    mocks.locationStore.getById.mockReturnValue(localMap);
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    expect(vm.layers).toHaveLength(1);
    expect(vm.visibleMarkers).toEqual([]);
    expect(vm.visibleAreas).toEqual([]);
    vm.drawMode = 'circle';
    await flushPromises();
    vm.drawMode = 'square';
    await flushPromises();
    vm.drawMode = 'freehand';
    await flushPromises();
    vm.drawMode = null;
    await flushPromises();
    vm.showMarkerInfo({ id: 'missing', title: '', entities: [] });
    await flushPromises();
    expect(wrapper.find('.map-info-title').text()).toContain('Untitled');

    vm.onMapClick({ pixel: [1, 1] });
    mapHarness.map.forEachFeatureAtPixel.mockReturnValueOnce({
      get: (key: string) => (key === 'markerId' ? 'missing' : undefined),
    });
    vm.onMapClick({ pixel: [1, 1] });
    mapHarness.map.forEachFeatureAtPixel.mockReturnValueOnce({
      get: (key: string) => (key === 'areaId' ? 'missing' : undefined),
    });
    vm.onMapClick({ pixel: [1, 1] });
    wrapper.unmount();
  });

  it('covers popup variants, titles and info anchoring', async () => {
    const localMap = structuredClone(map);
    localMap.markers[0] = {
      ...localMap.markers[0],
      title: '',
      description: 'desc',
    };
    localMap.areas[0] = { ...localMap.areas[0], title: '', icon: 'ra-tree' };
    localMap.areas.push({
      ...localMap.areas[0],
      id: 'a2',
      title: 'Area two',
      locationId: 'l1',
      description: 'area desc',
    });
    mocks.locationStore.getById.mockReturnValue(localMap);
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    vm.showMarkerInfo(localMap.markers[0]);
    await flushPromises();
    expect(wrapper.text()).toContain('Untitled marker');
    expect(wrapper.text()).toContain('desc');
    vm.isEditMode = true;
    await flushPromises();
    expect(wrapper.findAll('.map-info-actions button').length).toBeGreaterThan(
      0,
    );
    wrapper
      .findComponent({ name: 'QMenu' })
      .vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(vm.infoSelection).toBeNull();

    vm.showAreaInfo(localMap.areas[1]);
    await flushPromises();
    expect(wrapper.text()).toContain('Area two');
    expect(wrapper.text()).toContain('area desc');
    expect(wrapper.find('.map-area-label i').exists()).toBe(true);

    vm.showAreaInfo(localMap.areas[0]);
    await flushPromises();
    expect(wrapper.text()).toContain('Untitled area');

    vm.setInfoAnchor();
    expect(vm.infoAnchor).toEqual({ left: 0, top: 0 });
    mocks.prompt.mockResolvedValueOnce('');
    await vm.addLayer();
    mocks.prompt.mockResolvedValueOnce('');
    await vm.editLayer({ id: 'layer-2', title: 'Layer 2' });
    vm.onContextMenuOpen();
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

    expect(mocks.locationStore.update).toHaveBeenCalledWith(
      'map1',
      expect.objectContaining({
        map: expect.objectContaining({
          markers: expect.arrayContaining([
            expect.objectContaining({ title: 'New marker' }),
          ]),
        }),
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
    expect(mocks.locationStore.update).toHaveBeenCalledWith(
      'map1',
      expect.objectContaining({
        map: expect.objectContaining({
          markers: [expect.objectContaining({ title: 'Renamed' })],
        }),
      }),
    );

    editor.vm.$emit('delete', 'm1');
    await flushPromises();
    expect(mocks.locationStore.update).toHaveBeenLastCalledWith('map1', {
      map: expect.objectContaining({ markers: [] }),
    });
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
    vm.showLabels = false;
    await flushPromises();
    expect(wrapper.find('.map-area-label').exists()).toBe(false);
    const hiddenLabelStyles = vm.markerStyle({
      get: (key: string) => (key === 'markerId' ? 'm1' : undefined),
    });
    expect(hiddenLabelStyles).toHaveLength(1);

    vm.showLabels = true;
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
    expect(wrapper.find('.map-layer-add').text()).toContain('Add layer');
    expect(wrapper.find('.map-layer-add svg').exists()).toBe(true);
    expect(wrapper.find('.map-marker-accessible').exists()).toBe(true);

    wrapper.unmount();
  });

  it('does not expose edit or delete actions for the base layer', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;
    vm.isEditMode = true;
    await flushPromises();

    expect(wrapper.text()).toContain('Base');
    expect(wrapper.findAll('button[title="Edit layer"]')).toHaveLength(0);
    expect(wrapper.findAll('button[title="Delete layer"]')).toHaveLength(0);
    expect(wrapper.find('.map-layer-add').exists()).toBe(true);
    wrapper.unmount();
  });

  it('switches map modes from the icon button group', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    const viewButton = wrapper.find('.map-mode-view');
    const editButton = wrapper.find('.map-mode-edit');
    const controlsList = wrapper.find(
      '.map-sidepanel-controls [data-stub="QList"]',
    );
    expect(controlsList.exists()).toBe(true);
    expect(controlsList.find('.map-label-toggle').exists()).toBe(true);
    expect(controlsList.find('.map-mode-toggle').exists()).toBe(true);
    expect(controlsList.find('.map-layer-add').exists()).toBe(false);
    const modeGroup = wrapper.find('[data-stub="QBtnGroup"]');
    expect(wrapper.find('.map-mode-toggle').text()).toBe('');
    expect(modeGroup.classes()).toContain('full-width');
    expect(modeGroup.attributes()).toHaveProperty('spread');
    expect(viewButton.attributes('title')).toBe('View mode');
    expect(editButton.attributes('title')).toBe('Edit mode');
    expect(viewButton.text()).toBe('');
    expect(editButton.text()).toBe('');
    expect(vm.isEditMode).toBe(false);

    await editButton.trigger('click');
    expect(vm.isEditMode).toBe(true);
    expect(
      wrapper.find('.map-sidepanel-controls .map-layer-add').exists(),
    ).toBe(true);
    await wrapper.find('.map-mode-view').trigger('click');
    expect(vm.isEditMode).toBe(false);

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
    expect(mocks.locationStore.update).toHaveBeenCalledWith(
      'map1',
      expect.objectContaining({
        map: expect.objectContaining({
          areas: expect.arrayContaining([
            expect.objectContaining({ title: 'New area' }),
          ]),
        }),
      }),
    );

    vm.editArea(map.areas[0]);
    await flushPromises();
    expect(wrapper.findComponent(AreaEditorStub).props('area')).toEqual(
      map.areas[0],
    );

    editor.vm.$emit('delete', 'a1');
    await flushPromises();
    expect(mocks.locationStore.update).toHaveBeenLastCalledWith(
      'map1',
      expect.objectContaining({
        map: expect.objectContaining({
          areas: [expect.objectContaining({ title: 'New area' })],
        }),
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

  it('renders from an explicit location prop with normalized map data', async () => {
    mocks.locationStore.getById.mockReturnValue(undefined);
    const wrapper = await mountMapView({
      location: {
        id: 'loc-prop',
        name: '',
        description: undefined,
        entities: undefined,
        map: {
          fileId: '',
          layers: [],
          markers: [],
          areas: [],
        },
        createdAt: 1,
        updatedAt: 1,
      },
    });
    const vm = wrapper.vm as any;

    expect(vm.map).toMatchObject({
      id: 'loc-prop',
      title: '',
      description: '',
      entities: [],
    });
    expect(vm.layers).toEqual([{ id: 'base', title: 'Base' }]);
    wrapper.unmount();
  });

  it('handles a missing image record and unloaded location store', async () => {
    mocks.locationStore.isLoaded = false;
    mocks.getMapFile.mockResolvedValue(undefined);
    const wrapper = await mountMapView();
    await flushPromises();
    const vm = wrapper.vm as any;

    expect(mocks.locationStore.load).toHaveBeenCalled();
    expect(mocks.getMapFile).toHaveBeenCalledWith('file1');
    expect(vm.mapReady).toBe(false);
    wrapper.unmount();
  });

  it('ignores map actions without the expected payload', async () => {
    const wrapper = await mountMapView();
    const vm = wrapper.vm as any;

    vm.drawMode = 'polygon';
    vm.drawMode = null;
    vm.handleMapAction({ action: 'draw-area' });
    vm.handleMapAction({ action: 'unknown' });
    vm.handleMapAction({ action: 'cancel-drawing' });
    vm.onMapClick({});
    wrapper.unmount();
  });
});
