import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import LocationView from '@/maps/views/LocationView.vue';

const mocks = vi.hoisted(() => ({
  locationStore: {
    isLoaded: true,
    getById: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
    update: vi.fn(),
  },
  mapStore: {
    isLoaded: true,
    items: [] as any[],
    load: vi.fn().mockResolvedValue(undefined),
  },
  push: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'l1' } }),
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/maps/locations', () => ({
  useMapLocationStore: () => mocks.locationStore,
  deleteMapLocation: vi.fn(),
}));

vi.mock('@/maps/maps', () => ({
  useMapStore: () => mocks.mapStore,
}));

vi.mock('@/maps/composables/useMapEntityCatalog', () => ({
  useMapEntityCatalog: () => ({
    groups: {
      value: [
        { kind: 'map', labelKey: 'maps.title', titleField: 'title', items: [] },
        {
          kind: 'note',
          labelKey: 'notes.title',
          titleField: 'title',
          items: [],
        },
      ],
    },
  }),
}));

const BaseEntityTabViewStub = defineComponent({
  name: 'BaseEntityTabView',
  props: {
    tabs: { type: Array, default: () => [] },
    headerButtons: { type: Array, default: () => [] },
  },
  setup(props) {
    return () =>
      h('div', [
        h(
          'div',
          { class: 'tabs' },
          (props.tabs as any[]).map((tab) =>
            h('span', { class: 'tab' }, tab.id),
          ),
        ),
        ...(props.headerButtons as any[]).map((button) =>
          h('button', {
            class: 'header-button',
            title: button.title,
            onClick: button.event,
          }),
        ),
      ]);
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

function mountLocationView() {
  return mount(LocationView, {
    global: {
      stubs: {
        BaseEntityTabView: BaseEntityTabViewStub,
        TabGroup: true,
        EntitiesLinking: true,
        EntityScenesPanel: true,
        MapLocationEditor: true,
      },
    },
  });
}

describe('LocationView', () => {
  it('hides the map tab and links to the connected map from the header', async () => {
    mocks.locationStore.getById.mockReturnValue(location);
    mocks.mapStore.items = [
      { id: 'map1', locationId: 'l1', markers: [], areas: [] },
    ];

    const wrapper = mountLocationView();
    await flushPromises();

    const tabs = wrapper.findAll('.tab').map((tab) => tab.text());
    expect(tabs).toContain('note');
    expect(tabs).not.toContain('map');

    const headerButtons = wrapper.findAll('.header-button');
    expect(headerButtons).toHaveLength(1);
    expect(headerButtons[0].attributes('title')).toBe('maps.openLinkedMap');

    await headerButtons[0].trigger('click');
    expect(mocks.push).toHaveBeenCalledWith('/maps/map1');
    wrapper.unmount();
  });

  it('shows no map header button when the location has no map', async () => {
    mocks.locationStore.getById.mockReturnValue(location);
    mocks.mapStore.items = [];

    const wrapper = mountLocationView();
    await flushPromises();

    expect(wrapper.findAll('.header-button')).toHaveLength(0);
    wrapper.unmount();
  });
});
