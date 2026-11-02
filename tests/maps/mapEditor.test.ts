import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

import MapEditor from '@/maps/components/MapEditor.vue';
import type { MapEntity, MapFile } from '@/maps/types';
import { quasarStubs } from '../helpers/quasar-stubs';
import { createMapFileFromFile } from '@/maps/utils/mapFileUtils';
import { getMapFile, putMapFile } from '@/maps/maps';

vi.mock('@/maps/maps', () => ({
  getMapFile: vi.fn(),
  putMapFile: vi.fn(),
  deleteMapFile: vi.fn(),
  useMapStore: vi.fn(),
}));

const locationMocks = vi.hoisted(() => {
  const location = {
    id: 'l1',
    name: 'Town',
    description: '',
    entities: [{ kind: 'note', id: 'n1' }],
    createdAt: 1,
    updatedAt: 1,
  };
  return {
    location,
    store: {
      items: [location],
      getById: (id: string) => (id === location.id ? location : undefined),
      load: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock('@/maps/locations', () => ({
  useMapLocationStore: () => locationMocks.store,
}));

vi.mock('@/maps/utils/mapFileUtils', () => ({
  createMapFileFromFile: vi.fn(),
  getMapFileBlob: vi.fn().mockResolvedValue(new Blob(['image'])),
}));

const QInput = quasarStubs.QInput;

const mapFile: MapFile = {
  id: 'file1',
  name: 'world.png',
  size: 5,
  type: 'image/png',
  lastModified: 1,
  source: { kind: 'blob', blob: new Blob(['image']) },
  createdAt: 1,
  updatedAt: 1,
};

const existingMap: MapEntity = {
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
      icon: 'ra-castle',
      color: '#cc3333',
    },
  ],
  createdAt: 1,
  updatedAt: 2,
};

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: { kind: String, modelValue: Array },
  emits: ['update:modelValue'],
  setup(props) {
    return () =>
      h('div', {
        class: 'entities-linking-stub',
        'data-kind': props.kind,
        'data-count': props.modelValue?.length ?? 0,
      });
  },
});

function linkingBlock(wrapper: ReturnType<typeof mount>, kind: string) {
  return wrapper
    .findAllComponents(EntitiesLinkingStub)
    .find((entry) => entry.props('kind') === kind)!;
}

describe('MapEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createMapFileFromFile).mockResolvedValue(mapFile);
    vi.mocked(getMapFile).mockResolvedValue(mapFile);
    vi.mocked(putMapFile).mockResolvedValue(undefined);
  });

  it('creates a map with a selected image and locations', async () => {
    const wrapper = mount(MapEditor, {
      props: { map: null, isOpen: true },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });

    expect(
      wrapper.findComponent({ name: 'BaseModal' }).props('showDelete'),
    ).toBe(false);

    await wrapper.find('#map-title').setValue('New world');
    await wrapper.find('#map-description').setValue('Description');

    const fileInput = wrapper.find('input[type="file"]');
    const image = new File(['image'], 'world.png', { type: 'image/png' });
    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [image],
    });
    await fileInput.trigger('change');
    await nextTick();
    expect(createMapFileFromFile).toHaveBeenCalledWith(image);

    linkingBlock(wrapper, 'location').vm.$emit('update:modelValue', [
      { kind: 'location', id: 'l1' },
    ]);
    await nextTick();

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    await nextTick();

    expect(putMapFile).toHaveBeenCalledWith(mapFile);
    expect(wrapper.emitted('submit')?.[0][0]).toMatchObject({
      title: 'New world',
      description: 'Description',
      fileId: 'file1',
      markers: [],
      locationId: 'l1',
    });
  });

  it('edits an existing map and keeps markers', async () => {
    const wrapper = mount(MapEditor, {
      props: { map: existingMap, isOpen: true },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });
    await vi.waitFor(() => {
      expect(getMapFile).toHaveBeenCalledWith('file1');
    });
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('world.png');
    });
    expect(wrapper.find('#map-title').element.value).toBe('World');
    expect(
      wrapper.findComponent({ name: 'BaseModal' }).props('showDelete'),
    ).toBe(true);
    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('delete');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['map1']);

    await wrapper.find('#map-title').setValue('Renamed');
    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    await nextTick();

    expect(putMapFile).not.toHaveBeenCalled();
    expect(wrapper.emitted('submit')?.[0][0]).toMatchObject({
      title: 'Renamed',
      markers: [expect.objectContaining({ id: 'm1' })],
      locationId: 'l1',
    });
  });

  it('validates title and image and supports cancelling', async () => {
    const wrapper = mount(MapEditor, {
      props: { map: null, isOpen: true },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();

    linkingBlock(wrapper, 'location').vm.$emit('update:modelValue', [
      { kind: 'location', id: 'l1' },
    ]);
    await nextTick();

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
