import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import MapAreaEditor from '@/maps/components/MapAreaEditor.vue';
import MapAreasPanel from '@/maps/components/MapAreasPanel.vue';
import ColorPicker from '@/components/common/ColorPicker.vue';
import type { MapArea } from '@/maps/types';
import { quasarStubs } from '../helpers/quasar-stubs';
import { resetMockStores, seedMockStore } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

const area: MapArea = {
  id: 'a1',
  title: 'Forest',
  description: 'Dark woods',
  shape: 'polygon',
  points: [
    [0, 0],
    [100, 0],
    [100, 100],
  ],
  locationId: null,
  layerId: 'base',
  entities: [{ kind: 'note', id: 'n1' }],
  icon: 'ra-forest',
  color: '#336699',
};

const location = {
  id: 'l1',
  name: 'Town',
  description: '',
  color: '#336699',
  entities: [],
  createdAt: 1,
  updatedAt: 1,
};

const layers = [{ id: 'base', title: 'Base' }];

const area2: MapArea = {
  ...area,
  id: 'a2',
  title: 'Lake',
  entities: [],
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

const IconPickerStub = defineComponent({
  name: 'IconPicker',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  setup(props) {
    return () =>
      h('div', {
        class: 'icon-picker-stub',
        'data-icon': props.modelValue,
      });
  },
});

describe('MapAreaEditor', () => {
  it('edits area fields, links, icon and color then saves', async () => {
    const wrapper = mount(MapAreaEditor, {
      props: { isOpen: true, area, locations: [location], layers },
      global: {
        stubs: {
          EntitiesLinking: EntitiesLinkingStub,
          IconPicker: IconPickerStub,
        },
      },
    });

    await wrapper.find('#area-title').setValue('New forest');
    await wrapper.find('#area-description').setValue('Deep woods');

    linkingBlock(wrapper, 'location').vm.$emit('update:modelValue', [
      { kind: 'location', id: 'l1' },
    ]);
    linkingBlock(wrapper, 'map').vm.$emit('update:modelValue', [
      { kind: 'map', id: 'map2' },
    ]);
    wrapper
      .findComponent(IconPickerStub)
      .vm.$emit('update:modelValue', 'ra:ra-tree');
    wrapper.findComponent(ColorPicker).vm.$emit('update:modelValue', '#00ff00');
    await nextTick();

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    await nextTick();

    expect(wrapper.emitted('save')?.[0][0]).toMatchObject({
      id: 'a1',
      title: 'New forest',
      description: 'Deep woods',
      shape: 'polygon',
      points: area.points,
      locationId: 'l1',
      entities: [{ kind: 'map', id: 'map2' }],
      icon: 'ra:ra-tree',
      color: '#00ff00',
    });
  });

  it('validates the title, deletes and cancels', async () => {
    const wrapper = mount(MapAreaEditor, {
      props: { isOpen: true, area, locations: [location], layers },
      global: {
        stubs: {
          EntitiesLinking: EntitiesLinkingStub,
          IconPicker: IconPickerStub,
        },
      },
    });

    await wrapper.find('#area-title').setValue('');
    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(wrapper.emitted('save')).toBeUndefined();

    const deleteButton = wrapper
      .findAll('button')
      .find((button) => button.text().toLowerCase().includes('delete'));
    await deleteButton!.trigger('click');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['a1']);

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});

describe('MapAreasPanel', () => {
  it('lists areas, shapes, linked entities and emits selection', async () => {
    resetMockStores();

    const wrapper = mount(MapAreasPanel, {
      props: { areas: [area, area2] },
    });
    await nextTick();

    expect(wrapper.text()).toContain('Forest');
    expect(wrapper.text()).toContain('Dark woods');
    expect(wrapper.text()).not.toContain('Polygon');
    expect(wrapper.text()).not.toContain('Session note');
    expect(wrapper.text()).toContain('Lake');

    await wrapper.find('.map-area-item').trigger('click');
    expect(wrapper.emitted('select-area')?.[0]).toEqual(['a1']);

    await wrapper.find('.map-area-item').trigger('mouseenter');
    expect(wrapper.emitted('hover')?.[0]).toEqual(['a1']);
    await wrapper.find('.map-area-item').trigger('mouseleave');
    expect(wrapper.emitted('hover')?.[1]).toEqual([null]);

    const actions = wrapper.findAll('.map-area-action');
    await actions[0].trigger('click');
    expect(wrapper.emitted('edit')?.[0]?.[0]).toMatchObject({ id: 'a1' });

    await actions[1].trigger('click');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['a1']);
  });

  it('shows an empty state', () => {
    resetMockStores();
    const wrapper = mount(MapAreasPanel, { props: { areas: [] } });
    expect(wrapper.text()).toContain('No areas');
  });
});
