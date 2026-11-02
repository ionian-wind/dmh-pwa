import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import EntityLinksEditor from '@/maps/components/EntityLinksEditor.vue';
import IconPicker from '@/components/common/IconPicker.vue';
import ColorPicker from '@/components/common/ColorPicker.vue';
import { MAP_MARKER_ICONS } from '@/maps/icons';
import MapMarkerEditor from '@/maps/components/MapMarkerEditor.vue';
import MapLocationEditor from '@/maps/components/MapLocationEditor.vue';
import MapMarkersPanel from '@/maps/components/MapMarkersPanel.vue';
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
  entities: [{ kind: 'note', id: 'n1' }],
};

const layers = [{ id: 'base', title: 'Base' }];

const marker: MapMarker = {
  id: 'm1',
  title: 'Castle',
  description: 'Old castle',
  x: 100,
  y: 200,
  locationId: 'l1',
  layerId: 'base',
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
    const wrapper = mount(IconPicker, {
      props: {
        modelValue: 'ra:ra-castle-emblem',
        icons: MAP_MARKER_ICONS,
        collection: 'ra',
      },
    });

    expect(wrapper.findAll('.icon-picker-option').length).toBeGreaterThan(20);
    expect(wrapper.find('.icon-picker-trigger i').classes()).toContain(
      'ra-castle-emblem',
    );
    expect(wrapper.find('.icon-picker-preview-name').text()).toContain(
      'ra-castle-emblem',
    );
    expect(wrapper.find('[data-icon="ra-castle-emblem"]').classes()).toContain(
      'is-selected',
    );

    await wrapper.find('.icon-picker-search').setValue('sword');
    expect(wrapper.findAll('.icon-picker-option').length).toBeLessThan(20);

    const sword = wrapper.find('[data-icon="ra-sword"]');
    expect(sword.exists()).toBe(true);
    await sword.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      'ra:ra-sword',
    ]);

    await wrapper.find('.icon-picker-none').trigger('click');
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
  name: 'IconPicker',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  setup(props) {
    return () =>
      h('div', { class: 'icon-picker-stub', 'data-icon': props.modelValue });
  },
});

describe('map marker editor', () => {
  it('edits marker fields, links and icon then saves', async () => {
    const wrapper = mount(MapMarkerEditor, {
      props: { isOpen: true, marker, locations: [location], layers },
      global: {
        stubs: {
          EntityLinksEditor: EntityLinksStub,
          IconPicker: IconPickerStub,
        },
      },
    });

    const title = wrapper.find('#marker-title');
    await title.setValue('New castle');
    await wrapper.find('#marker-description').setValue('Updated description');

    const locationSelect = wrapper.findComponent(QSelect);
    locationSelect.vm.$emit('update:modelValue', 'l1');
    await nextTick();

    wrapper
      .findComponent(EntityLinksStub)
      .vm.$emit('update:modelValue', [{ kind: 'map', id: 'map2' }]);
    wrapper
      .findComponent(IconPickerStub)
      .vm.$emit('update:modelValue', 'ra:ra-sword');
    const colorPickers = wrapper.findAllComponents(ColorPicker);
    colorPickers[0].vm.$emit('update:modelValue', '#00ff00');
    colorPickers[1].vm.$emit('update:modelValue', '#ffffff');
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
      icon: 'ra:ra-sword',
      color: '#00ff00',
      backgroundColor: '#ffffff',
    });
  });

  it('validates the title, deletes and cancels', async () => {
    const wrapper = mount(MapMarkerEditor, {
      props: { isOpen: true, marker, locations: [location], layers },
      global: {
        stubs: {
          EntityLinksEditor: EntityLinksStub,
          IconPicker: IconPickerStub,
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

describe('map markers panel', () => {
  it('lists markers and emits select, edit and delete actions', async () => {
    const wrapper = mount(MapMarkersPanel, {
      props: { markers: [marker] },
    });
    await nextTick();

    expect(wrapper.text()).toContain('Castle');
    expect(wrapper.text()).toContain('Old castle');

    await wrapper.find('.map-marker-item').trigger('click');
    expect(wrapper.emitted('select-marker')?.[0]).toEqual(['m1']);

    await wrapper.find('.map-marker-item').trigger('mouseenter');
    expect(wrapper.emitted('hover')?.[0]).toEqual(['m1']);
    await wrapper.find('.map-marker-item').trigger('mouseleave');
    expect(wrapper.emitted('hover')?.[1]).toEqual([null]);

    const actions = wrapper.findAll('.map-marker-action');
    await actions[0].trigger('click');
    expect(wrapper.emitted('edit')?.[0]?.[0]).toMatchObject({ id: 'm1' });

    await actions[1].trigger('click');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['m1']);
  });

  it('shows an empty state', () => {
    const wrapper = mount(MapMarkersPanel, { props: { markers: [] } });
    expect(wrapper.text()).toContain('No markers');
  });
});

describe('map location editor', () => {
  it('edits location fields and links then saves', async () => {
    const wrapper = mount(MapLocationEditor, {
      props: { isOpen: true, location },
      global: { stubs: { EntityLinksEditor: EntityLinksStub } },
    });

    await wrapper.find('#location-name').setValue('Capital');
    await wrapper.find('#location-description').setValue('Large city');
    wrapper
      .findComponent(EntityLinksStub)
      .vm.$emit('update:modelValue', [{ kind: 'map', id: 'map2' }]);
    await nextTick();

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    await nextTick();

    expect(wrapper.emitted('save')?.[0][0]).toMatchObject({
      id: 'l1',
      name: 'Capital',
      description: 'Large city',
      entities: [{ kind: 'map', id: 'map2' }],
    });
  });

  it('validates the name, deletes and cancels', async () => {
    const wrapper = mount(MapLocationEditor, {
      props: { isOpen: true, location },
      global: { stubs: { EntityLinksEditor: EntityLinksStub } },
    });

    await wrapper.find('#location-name').setValue('   ');
    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(wrapper.emitted('save')).toBeUndefined();

    const deleteButton = wrapper
      .findAll('button')
      .find((button) => button.text().toLowerCase().includes('delete'));
    expect(deleteButton!.element.closest('.modal-actions')).not.toBeNull();
    await deleteButton!.trigger('click');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['l1']);

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
