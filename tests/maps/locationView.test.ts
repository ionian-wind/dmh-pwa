import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import LocationView from '@/maps/views/LocationView.vue';

const mocks = vi.hoisted(() => ({
  locationStore: {
    isLoaded: true,
    getById: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  },
  mapStore: {
    isLoaded: true,
    items: [] as any[],
    load: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@/maps/maps', () => ({
  useMapStore: () => mocks.mapStore,
}));

vi.mock('@/dialogs', () => ({ confirm: mocks.confirm }));

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

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: { kind: String, modelValue: Array },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        {
          class: 'link-update',
          'data-kind': props.kind,
          onClick: () =>
            emit('update:modelValue', [{ kind: props.kind, id: 'note-1' }]),
        },
        'update',
      );
  },
});

const TabGroupStub = defineComponent({
  name: 'TabGroup',
  props: { modelValue: String, tabs: Array },
  emits: ['update:modelValue'],
  setup(_, { slots }) {
    return () => h('div', { class: 'tab-group-stub' }, slots.default?.());
  },
});

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
        ...(props.headerButtons as any[]).map((button) =>
          h('button', {
            class: 'header-button',
            title: button.title,
            onClick: button.event,
          }),
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
  createdAt: 1,
  updatedAt: 1,
};

function mountLocationView() {
  return mount(LocationView, {
    global: {
      stubs: {
        BaseEntityTabView: BaseEntityTabViewStub,
        TabGroup: TabGroupStub,
        EntitiesLinking: EntitiesLinkingStub,
        EntityScenesPanel: true,
        MapLocationEditor: MapLocationEditorStub,
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

  it('updates links, edits and deletes the location', async () => {
    mocks.locationStore.getById.mockReturnValue(location);
    mocks.mapStore.items = [];

    const wrapper = mountLocationView();
    await flushPromises();

    await wrapper.find('.link-update').trigger('click');
    expect(mocks.locationStore.update).toHaveBeenCalledWith('l1', {
      entities: [{ kind: 'note', id: 'note-1' }],
    });

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
    expect(mocks.push).toHaveBeenCalledWith('/maps?tab=locations');
    wrapper.unmount();
  });

  it('lists linked markers and areas from all maps', async () => {
    mocks.locationStore.getById.mockReturnValue(location);
    mocks.mapStore.items = [
      {
        id: 'map1',
        title: 'World',
        locationId: 'l1',
        markers: [{ id: 'm1', title: 'Castle', locationId: 'l1' }],
        areas: [{ id: 'a1', title: 'Forest', locationId: 'l1' }],
      },
    ];

    const wrapper = mountLocationView();
    await flushPromises();

    expect(wrapper.text()).toContain('Castle');
    expect(wrapper.text()).toContain('Forest');
    await wrapper.find('.location-linked-item').trigger('click');
    expect(mocks.push).toHaveBeenCalledWith('/maps/map1');
    wrapper.unmount();
  });

  it('does nothing when the location is missing', async () => {
    mocks.locationStore.getById.mockReturnValue(undefined);
    mocks.mapStore.items = [];
    const wrapper = mountLocationView();
    await flushPromises();
    expect(wrapper.findAll('.tab')).toHaveLength(1);
    wrapper.unmount();
  });
});
