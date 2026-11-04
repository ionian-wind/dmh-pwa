import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import LocationView from '@/maps/views/LocationView.vue';

const mocks = vi.hoisted(() => ({
  locationStore: {
    isLoaded: true,
    getById: vi.fn(),
    items: [] as any[],
    load: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  },
  deleteLocation: vi.fn(),
  confirm: vi.fn().mockResolvedValue(true),
  push: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'l1' } }),
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/maps/locations', () => ({
  useMapLocationStore: () => mocks.locationStore,
  deleteMapLocation: mocks.deleteLocation,
}));

vi.mock('@/dialogs', () => ({ confirm: mocks.confirm }));

const MapLocationEditorStub = defineComponent({
  name: 'MapLocationEditor',
  props: { isOpen: Boolean, location: Object },
  emits: ['save', 'delete', 'cancel'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'location-editor-stub' }, [
        h(
          'button',
          {
            class: 'editor-save',
            onClick: () =>
              emit('save', {
                ...props.location,
                name: 'Updated town',
                description: 'Updated',
                entities: [],
              }),
          },
          'save',
        ),
        h(
          'button',
          { class: 'editor-delete', onClick: () => emit('delete') },
          'delete',
        ),
        h(
          'button',
          { class: 'editor-cancel', onClick: () => emit('cancel') },
          'cancel',
        ),
      ]);
  },
});

const MapTabStub = defineComponent({
  name: 'LocationMapTab',
  props: { location: Object },
  setup() {
    return () => h('div', { class: 'map-tab-stub' }, 'map');
  },
});

const BaseEntityTabViewStub = defineComponent({
  name: 'BaseEntityTabView',
  props: {
    tabs: { type: Array, default: () => [] },
    headerButtons: { type: Array, default: () => [] },
    onDelete: Function,
    onEdit: Function,
  },
  setup(props, { slots }) {
    return () =>
      h('div', [
        h(
          'div',
          { class: 'tabs' },
          (props.tabs as any[]).map((tab) =>
            h('span', { class: 'tab' }, tab.id),
          ),
        ),
        h('button', { class: 'entity-delete', onClick: props.onDelete }, 'del'),
        h('button', { class: 'entity-edit', onClick: props.onEdit }, 'edit'),
        h('div', { class: 'default-slot' }, slots.default?.()),
        ...Object.entries(slots)
          .filter(
            ([name]) => !['default', 'sidepanel', 'editor'].includes(name),
          )
          .map(([name, slot]) =>
            h('div', { class: 'entity-slot', 'data-slot': name }, slot?.()),
          ),
        h('div', { class: 'sidepanel-slot' }, slots.sidepanel?.()),
        h('div', { class: 'editor-slot' }, slots.editor?.()),
      ]);
  },
});

const location = {
  id: 'l1',
  name: 'Town',
  description: '',
  entities: [{ kind: 'note', id: 'note-1' }],
  map: {
    fileId: '',
    layers: [{ id: 'base', title: 'Base' }],
    markers: [],
    areas: [],
  },
  createdAt: 1,
  updatedAt: 1,
};

function mountLocationView() {
  return mount(LocationView, {
    global: {
      stubs: {
        BaseEntityTabView: BaseEntityTabViewStub,
        EntityScenesPanel: true,
        MapLocationEditor: MapLocationEditorStub,
        LocationMapTab: MapTabStub,
      },
    },
  });
}

describe('LocationView', () => {
  it('renders view, map, links and backlinks tabs with description content', async () => {
    const current = {
      ...location,
      description: 'A busy port.',
      map: { ...location.map, fileId: 'file1' },
    };
    mocks.locationStore.getById.mockReturnValue(current);
    mocks.locationStore.items = [current];

    const wrapper = mountLocationView();
    await flushPromises();

    const tabs = wrapper.findAll('.tab').map((tab) => tab.text());
    expect(tabs).toEqual(['main', 'map', 'backlinks', 'links']);
    expect(wrapper.find('[data-slot="main"]').text()).toContain('A busy port.');
    expect(wrapper.find('[data-slot="map"] .map-tab-stub').exists()).toBe(true);
    expect(wrapper.find('#location-map-sidebar').exists()).toBe(true);
    wrapper.unmount();
  });

  it('updates links, edits and deletes the location', async () => {
    mocks.locationStore.getById.mockReturnValue(location);
    mocks.locationStore.items = [location];

    const wrapper = mountLocationView();
    await flushPromises();

    await wrapper.find('.entity-edit').trigger('click');
    expect(wrapper.find('.location-editor-stub').exists()).toBe(true);
    await wrapper.find('.editor-save').trigger('click');
    expect(mocks.locationStore.update).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({ name: 'Updated town' }),
    );
    await wrapper.find('.editor-cancel').trigger('click');

    await wrapper.find('.entity-delete').trigger('click');
    await flushPromises();
    expect(mocks.deleteLocation).toHaveBeenCalledWith('l1');
    expect(mocks.push).toHaveBeenCalledWith('/maps');
    wrapper.unmount();
  });

  it('lists markers and areas from other locations in the backlinks tab', async () => {
    const current = { ...location };
    const other = {
      ...location,
      id: 'l2',
      name: 'Region',
      entities: [],
      map: {
        fileId: '',
        layers: [{ id: 'base', title: 'Base' }],
        markers: [
          {
            id: 'm1',
            title: 'Castle',
            x: 1,
            y: 2,
            locationId: 'l1',
            layerId: 'base',
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
            points: [],
            locationId: 'l1',
            layerId: 'base',
            entities: [],
            color: '#336699',
          },
        ],
      },
    };
    mocks.locationStore.getById.mockReturnValue(current);
    mocks.locationStore.items = [current, other];

    const wrapper = mountLocationView();
    await flushPromises();

    const backlinks = wrapper.find('[data-slot="backlinks"]');
    expect(backlinks.text()).toContain('Region');
    expect(backlinks.text()).toContain('Castle');
    expect(backlinks.text()).toContain('Forest');

    await backlinks.find('[data-stub="QItem"]').trigger('click');
    expect(mocks.push).toHaveBeenCalledWith('/locations/l2');
    wrapper.unmount();
  });

  it('renders a description fallback when the location is missing', async () => {
    mocks.locationStore.getById.mockReturnValue(undefined);
    mocks.locationStore.items = [];

    const wrapper = mountLocationView();
    await flushPromises();

    expect(wrapper.findAll('.tab')).toHaveLength(3);
    expect(wrapper.find('[data-slot="main"]').text()).toContain(
      'No description provided',
    );
    wrapper.unmount();
  });

  it('shows an empty backlinks state and ignores the current location', async () => {
    const current = { ...location };
    const empty = {
      ...location,
      id: 'l2',
      name: 'Empty',
      entities: [],
      map: {
        fileId: '',
        layers: [{ id: 'base', title: 'Base' }],
        markers: [],
        areas: [],
      },
    };
    mocks.locationStore.getById.mockReturnValue(current);
    mocks.locationStore.items = [current, empty];

    const wrapper = mountLocationView();
    await flushPromises();

    const backlinks = wrapper.find('[data-slot="backlinks"]');
    expect(backlinks.text()).toContain(
      'No markers or areas link back to this location.',
    );
    expect(backlinks.text()).not.toContain('Town');
    wrapper.unmount();
  });

  it('does not delete when confirmation is cancelled', async () => {
    mocks.locationStore.getById.mockReturnValue(location);
    mocks.locationStore.items = [location];
    mocks.confirm.mockResolvedValueOnce(false);

    const wrapper = mountLocationView();
    await flushPromises();

    await wrapper.find('.entity-delete').trigger('click');
    await flushPromises();

    expect(mocks.deleteLocation).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('handles deletion and saves when the location is missing', async () => {
    mocks.locationStore.getById.mockReturnValue(undefined);
    mocks.locationStore.items = [];

    const wrapper = mountLocationView();
    await flushPromises();

    await wrapper.find('.entity-delete').trigger('click');
    expect(mocks.deleteLocation).not.toHaveBeenCalled();
    wrapper.findComponent(MapLocationEditorStub).vm.$emit('save', null);
    expect(mocks.locationStore.update).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('renders fallback labels for unnamed backlink items', async () => {
    const current = { ...location };
    const other = {
      ...location,
      id: 'l2',
      name: '',
      entities: [],
      map: {
        fileId: '',
        layers: [{ id: 'base', title: 'Base' }],
        markers: [
          {
            id: 'm1',
            title: '',
            x: 1,
            y: 2,
            locationId: 'l1',
            layerId: 'base',
            entities: [],
            icon: '',
            color: '',
          },
        ],
        areas: [
          {
            id: 'a1',
            title: '',
            shape: 'polygon',
            points: [],
            locationId: 'l1',
            layerId: 'base',
            entities: [],
            color: '',
          },
        ],
      },
    };
    const noMap = { ...location, id: 'l3', name: 'No map', map: undefined };
    mocks.locationStore.getById.mockReturnValue(current);
    mocks.locationStore.items = [current, other, noMap as any];

    const wrapper = mountLocationView();
    await flushPromises();

    const backlinks = wrapper.find('[data-slot="backlinks"]');
    expect(backlinks.text()).toContain('Untitled location');
    expect(backlinks.text()).toContain('Untitled marker');
    expect(backlinks.text()).toContain('Untitled area');
    wrapper.unmount();
  });

  it('handles deletion and editor saves without a location', async () => {
    mocks.locationStore.getById.mockReturnValue(undefined);
    mocks.locationStore.items = [];

    const wrapper = mountLocationView();
    await flushPromises();
    await wrapper.find('.entity-delete').trigger('click');
    await flushPromises();
    expect(mocks.deleteLocation).not.toHaveBeenCalled();
    wrapper.unmount();

    mocks.locationStore.getById.mockReturnValue(location);
    const withLocation = mountLocationView();
    await flushPromises();
    const editor = withLocation.findComponent(MapLocationEditorStub);
    editor.vm.$emit('save', null);
    await flushPromises();
    expect(mocks.locationStore.update).not.toHaveBeenCalled();
    withLocation.unmount();
  });

  it('uses the untitled fallback when deleting an unnamed location', async () => {
    const unnamed = { ...location, name: '' };
    mocks.locationStore.getById.mockReturnValue(unnamed);
    mocks.locationStore.items = [unnamed];
    const wrapper = mountLocationView();
    await flushPromises();

    await wrapper.find('.entity-delete').trigger('click');
    await flushPromises();

    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Untitled location'),
    );
    wrapper.unmount();
  });

  it('separates multiple backlink groups and labels unnamed ones', async () => {
    const current = { ...location };
    const first = {
      ...location,
      id: 'l3',
      name: '',
      entities: [],
      map: {
        fileId: '',
        layers: [{ id: 'base', title: 'Base' }],
        markers: [
          {
            id: 'm3',
            title: 'Keep',
            x: 1,
            y: 2,
            locationId: 'l1',
            layerId: 'base',
            entities: [],
            icon: '',
            color: '',
          },
        ],
        areas: [],
      },
    };
    const second = {
      ...location,
      id: 'l4',
      name: 'Second',
      entities: [],
      map: {
        fileId: '',
        layers: [{ id: 'base', title: 'Base' }],
        markers: [],
        areas: [
          {
            id: 'a4',
            title: 'Grove',
            shape: 'polygon',
            points: [],
            locationId: 'l1',
            layerId: 'base',
            entities: [],
            color: '',
          },
        ],
      },
    };
    mocks.locationStore.getById.mockReturnValue(current);
    mocks.locationStore.items = [current, first, second];

    const wrapper = mountLocationView();
    await flushPromises();
    const backlinks = wrapper.find('[data-slot="backlinks"]');

    expect(backlinks.text()).toContain('Untitled location');
    expect(backlinks.text()).toContain('Second');
    expect(backlinks.findAll('[data-stub="QSeparator"]')).toHaveLength(1);
    wrapper.unmount();
  });

  it('hides the map tab when the location has no map image', async () => {
    mocks.locationStore.getById.mockReturnValue(location);
    mocks.locationStore.items = [location];

    const wrapper = mountLocationView();
    await flushPromises();

    const tabs = wrapper.findAll('.tab').map((tab) => tab.text());
    expect(tabs).toEqual(['main', 'backlinks', 'links']);
    expect(tabs).not.toContain('map');
    expect(wrapper.find('#location-map-sidebar').exists()).toBe(false);
    wrapper.unmount();
  });
});
