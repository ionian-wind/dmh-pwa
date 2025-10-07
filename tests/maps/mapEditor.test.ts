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
  locations: [
    {
      id: 'l1',
      name: 'Town',
      description: '',
      entities: [{ kind: 'note', id: 'n1' }],
    },
  ],
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
  createdAt: 1,
  updatedAt: 2,
};

const EntityLinksStub = defineComponent({
  name: 'EntityLinksEditor',
  props: { modelValue: Array },
  emits: ['update:modelValue'],
  setup(props) {
    return () =>
      h('div', {
        class: 'entity-links-stub',
        'data-count': props.modelValue?.length ?? 0,
      });
  },
});

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
      global: { stubs: { EntityLinksEditor: EntityLinksStub } },
    });

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

    const addLocation = wrapper
      .findAll('button')
      .find((button) => button.text().toLowerCase().includes('add location'));
    await addLocation!.trigger('click');
    await nextTick();

    await wrapper.find('#location-name-0').setValue('Town');
    await wrapper.find('#location-description-0').setValue('Starting town');
    wrapper
      .findComponent(EntityLinksStub)
      .vm.$emit('update:modelValue', [{ kind: 'note', id: 'n1' }]);
    await nextTick();

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    await nextTick();

    expect(putMapFile).toHaveBeenCalledWith(mapFile);
    expect(wrapper.emitted('submit')?.[0][0]).toMatchObject({
      title: 'New world',
      description: 'Description',
      fileId: 'file1',
      markers: [],
      locations: [
        expect.objectContaining({
          name: 'Town',
          description: 'Starting town',
          entities: [{ kind: 'note', id: 'n1' }],
        }),
      ],
    });
  });

  it('edits an existing map and keeps markers', async () => {
    const wrapper = mount(MapEditor, {
      props: { map: existingMap, isOpen: true },
      global: { stubs: { EntityLinksEditor: EntityLinksStub } },
    });
    await vi.waitFor(() => {
      expect(getMapFile).toHaveBeenCalledWith('file1');
    });
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('world.png');
    });
    expect(wrapper.find('#map-title').element.value).toBe('World');

    await wrapper.find('#map-title').setValue('Renamed');
    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    await nextTick();

    expect(putMapFile).not.toHaveBeenCalled();
    expect(wrapper.emitted('submit')?.[0][0]).toMatchObject({
      title: 'Renamed',
      markers: [expect.objectContaining({ id: 'm1' })],
      locations: [expect.objectContaining({ id: 'l1' })],
    });
  });

  it('validates title and image and supports cancelling/removing locations', async () => {
    const wrapper = mount(MapEditor, {
      props: { map: null, isOpen: true },
      global: { stubs: { EntityLinksEditor: EntityLinksStub } },
    });

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();

    const addLocation = wrapper
      .findAll('button')
      .find((button) => button.text().toLowerCase().includes('add location'));
    await addLocation!.trigger('click');
    await nextTick();
    const remove = wrapper
      .findAll('button')
      .find((button) => button.text().toLowerCase().includes('remove'));
    await remove!.trigger('click');
    await nextTick();
    expect(wrapper.find('#location-name-0').exists()).toBe(false);

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
