import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import EntityLinksEditor from '@/maps/components/EntityLinksEditor.vue';
import MapIconPicker from '@/maps/components/MapIconPicker.vue';
import MapMarkerEditor from '@/maps/components/MapMarkerEditor.vue';
import MapLocationsPanel from '@/maps/components/MapLocationsPanel.vue';
import type { MapLocation, MapMarker } from '@/maps/types';
import { quasarStubs } from '../helpers/quasar-stubs';
import { resetMockStores, seedMockStore } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));
vi.mock('@/maps/utils/mapFileUtils', () => ({
  createMapFileFromFile: vi.fn(),
  putMapFile: vi.fn(),
  getMapFile: vi.fn(),
  deleteMapFile: vi.fn(),
}));

const QInput = quasarStubs.QInput;
const QSelect = quasarStubs.QSelect;

const location: MapLocation = {
  id: 'l1',
  name: 'Town',
  description: 'Starting town',
  color: '#336699',
  entities: [{ kind: 'note', id: 'n1' }],
};

const marker: MapMarker = {
  id: 'm1',
  title: 'Castle',
  description: 'Old castle',
  x: 100,
  y: 200,
  locationId: 'l1',
  entities: [{ kind: 'monster', id: 'mon1' }],
  icon: 'ra-castle-emblem',
  color: '#cc3333',
};

describe('map entity links editor', () => {
  beforeEach(() => {
    resetMockStores();
    seedMockStore('notes', [{ id: 'n1', title: 'Session note' }]);
    seedMockStore('monsters', [{ id: 'mon1', name: 'Goblin' }]);
    seedMockStore('maps', [{ id: 'map2', title: 'Region map' }]);
  });

  it('adds and removes deduplicated entity links', async () => {
    const wrapper = mount(EntityLinksEditor, {
      props: { modelValue: [] },
    });
    await nextTick();

    const selects = wrapper.findAllComponents(QSelect);
    selects[0].vm.$emit('update:modelValue', 'monster');
    await nextTick();
    selects[1].vm.$emit('update:modelValue', 'mon1');
    await nextTick();

    const addButton = wrapper
      .findAll('button')
      .find((button) => button.text().toLowerCase().includes('add'));
    await addButton!.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      [{ kind: 'monster', id: 'mon1' }],
    ]);

    await wrapper.setProps({
      modelValue: [
        { kind: 'monster', id: 'mon1' },
        { kind: 'map', id: 'map2' },
      ],
    });
    expect(wrapper.text()).toContain('Goblin');
    expect(wrapper.text()).toContain('Region map');

    const removeButtons = wrapper.findAll('.entity-link-remove');
    await removeButtons[0].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      [{ kind: 'map', id: 'map2' }],
    ]);
  });
});

describe('map icon picker', () => {
  it('filters icons and selects one', async () => {
    const wrapper = mount(MapIconPicker, {
      props: { modelValue: 'ra-castle-emblem' },
    });

    expect(wrapper.findAll('.map-icon-option').length).toBeGreaterThan(20);
    expect(wrapper.find('[data-icon="ra-castle-emblem"]').classes()).toContain(
      'is-selected',
    );

    await wrapper.find('.map-icon-search').setValue('sword');
    expect(wrapper.findAll('.map-icon-option').length).toBeLessThan(20);

    const sword = wrapper.find('[data-icon="ra-sword"]');
    expect(sword.exists()).toBe(true);
    await sword.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['ra-sword']);

    await wrapper.find('.map-icon-none').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['']);
  });
});

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

const IconPickerStub = defineComponent({
  name: 'MapIconPicker',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  setup(props) {
    return () => h('div', { class: 'icon-picker-stub', 'data-icon': props.modelValue });
  },
});

describe('map marker editor', () => {
  it('edits marker fields, links and icon then saves', async () => {
    const wrapper = mount(MapMarkerEditor, {
      props: { isOpen: true, marker, locations: [location] },
      global: {
        stubs: {
          EntityLinksEditor: EntityLinksStub,
          MapIconPicker: IconPickerStub,
        },
      },
    });

    const title = wrapper.find('#marker-title');
    await title.setValue('New castle');
    await wrapper.find('#marker-description').setValue('Updated description');

    const locationSelect = wrapper.findComponent(QSelect);
    locationSelect.vm.$emit('update:modelValue', 'l1');
    await nextTick();

    wrapper.findComponent(EntityLinksStub).vm.$emit('update:modelValue', [
      { kind: 'map', id: 'map2' },
    ]);
    wrapper.findComponent(IconPickerStub).vm.$emit(
      'update:modelValue',
      'ra-sword',
    );
    await wrapper.find('#marker-color').setValue('#00ff00');
    await nextTick();

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    await nextTick();

    expect(wrapper.emitted('save')?.[0][0]).toMatchObject({
      id: 'm1',
      title: 'New castle',
      description: 'Updated description',
      x: 100,
      y: 200,
      locationId: 'l1',
      entities: [{ kind: 'map', id: 'map2' }],
      icon: 'ra-sword',
      color: '#00ff00',
    });
  });

  it('validates the title, deletes and cancels', async () => {
    const wrapper = mount(MapMarkerEditor, {
      props: { isOpen: true, marker, locations: [location] },
      global: {
        stubs: {
          EntityLinksEditor: EntityLinksStub,
          MapIconPicker: IconPickerStub,
        },
      },
    });

    await wrapper.find('#marker-title').setValue('');
    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(wrapper.emitted('save')).toBeUndefined();

    const deleteButton = wrapper
      .findAll('button')
      .find((button) => button.text().toLowerCase().includes('delete'));
    await deleteButton!.trigger('click');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['m1']);

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});

describe('map locations panel', () => {
  it('lists locations, linked entities and marker counts', async () => {
    const wrapper = mount(MapLocationsPanel, {
      props: {
        locations: [location],
        markers: [marker, { ...marker, id: 'm2', locationId: 'l1' }],
      },
    });
    await nextTick();

    expect(wrapper.text()).toContain('Town');
    expect(wrapper.text()).toContain('Starting town');
    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('Session note');

    await wrapper.find('.map-location-item').trigger('click');
    expect(wrapper.emitted('select-location')?.[0]).toEqual(['l1']);
  });

  it('shows an empty state', () => {
    const wrapper = mount(MapLocationsPanel, {
      props: { locations: [], markers: [] },
    });
    expect(wrapper.text()).toContain('No locations');
  });
});
