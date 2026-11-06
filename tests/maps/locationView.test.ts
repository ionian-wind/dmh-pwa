import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import LocationView from '@/maps/views/LocationView.vue';
import MarkdownHelpDialog from '@/components/common/MarkdownHelpDialog.vue';

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
  alert: vi.fn().mockResolvedValue(undefined),
  push: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'l1' } }),
  useRouter: () => ({ push: mocks.push }),
  onBeforeRouteLeave: vi.fn(),
}));

vi.mock('@/maps/locations', () => ({
  useMapLocationStore: () => mocks.locationStore,
  deleteMapLocation: mocks.deleteLocation,
}));

vi.mock('@/dialogs', () => ({ confirm: mocks.confirm, alert: mocks.alert }));

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

const ScenesStub = defineComponent({
  name: 'EntityScenesPanel',
  props: { entityType: String, entityId: String },
  setup() {
    return () => h('div', { class: 'scenes-stub' });
  },
});

const EntityMarkdownEditorStub = defineComponent({
  name: 'EntityMarkdownEditor',
  props: ['modelValue', 'isVisualMode', 'entityId', 'entityType'],
  emits: ['update:modelValue'],
  setup(_, { expose }) {
    expose({ getMarkdown: () => 'Updated description' });
    return () => h('div', { class: 'entity-markdown-editor-stub' });
  },
});

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: { kind: String, modelValue: Array },
  emits: ['update:modelValue'],
  setup() {
    return () => h('div', { class: 'entities-linking-stub' });
  },
});

const BaseEntityTabViewStub = defineComponent({
  name: 'BaseEntityTabView',
  props: {
    modelValue: String,
    tabs: { type: Array, default: () => [] },
    headerButtons: { type: Array, default: () => [] },
    onDelete: Function,
    onEdit: Function,
  },
  emits: ['update:modelValue'],
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
        EntityScenesPanel: ScenesStub,
        MapLocationEditor: MapLocationEditorStub,
        LocationMapTab: MapTabStub,
        EntityMarkdownEditor: EntityMarkdownEditorStub,
        EntitiesLinking: EntitiesLinkingStub,
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
    expect(wrapper.find('.scenes-stub').exists()).toBe(true);
    const mapSidebar = wrapper.find('#location-map-sidebar');
    expect(mapSidebar.exists()).toBe(true);
    expect((mapSidebar.element as HTMLElement).style.display).toBe('none');

    wrapper
      .findComponent(BaseEntityTabViewStub)
      .vm.$emit('update:modelValue', 'map');
    await nextTick();
    expect((mapSidebar.element as HTMLElement).style.display).not.toBe('none');
    expect(wrapper.find('.scenes-stub').exists()).toBe(false);
    wrapper.unmount();
  });

  it('updates links, edits and deletes the location', async () => {
    mocks.locationStore.getById.mockReturnValue(location);
    mocks.locationStore.items = [location];

    const wrapper = mountLocationView();
    await flushPromises();

    await wrapper.find('.entity-edit-mode').trigger('click');
    await nextTick();
    expect(wrapper.find('.entity-inline-editor').exists()).toBe(true);
    await wrapper.find('.entity-inline-editor input').setValue('Updated town');
    await wrapper.find('.entity-view-mode').trigger('click');
    await flushPromises();
    expect(mocks.locationStore.update).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({ name: 'Updated town' }),
    );

    await wrapper.find('.entity-delete').trigger('click');
    await flushPromises();
    expect(mocks.deleteLocation).toHaveBeenCalledWith('l1');
    expect(mocks.push).toHaveBeenCalledWith('/locations');
    wrapper.unmount();
  });

  it('edits inline, saves description/links and exposes formatting help', async () => {
    const current = {
      ...location,
      description: 'A busy port.',
      map: { ...location.map, fileId: 'file1' },
    };
    mocks.locationStore.getById.mockReturnValue(current);
    mocks.locationStore.items = [current];

    const wrapper = mountLocationView();
    await flushPromises();

    await wrapper.find('.entity-edit-mode').trigger('click');
    await nextTick();
    expect(wrapper.find('.entity-inline-editor').exists()).toBe(true);

    await wrapper.find('.entity-inline-editor input').setValue('Updated town');
    wrapper
      .findComponent(EntityMarkdownEditorStub)
      .vm.$emit('update:modelValue', 'Changed description');
    await nextTick();

    const linkBlocks = wrapper.findAllComponents(EntitiesLinkingStub);
    expect(linkBlocks.length).toBeGreaterThan(0);
    const moduleLinks = linkBlocks.find(
      (block) => block.props('kind') === 'module',
    )!;
    moduleLinks.vm.$emit('update:modelValue', [
      { kind: 'note', id: 'note-1' },
      { kind: 'module', id: 'module-2' },
    ]);
    await nextTick();

    wrapper
      .findComponent({ name: 'QToggle' })
      .vm.$emit('update:modelValue', false);
    await nextTick();
    const headerButtons = wrapper
      .findComponent(BaseEntityTabViewStub)
      .props('headerButtons') as any[];
    expect(headerButtons).toHaveLength(1);
    headerButtons[0].event();
    await nextTick();
    expect(wrapper.findComponent(MarkdownHelpDialog).props('isOpen')).toBe(
      true,
    );

    await wrapper.find('.entity-view-mode').trigger('click');
    await flushPromises();
    expect(mocks.locationStore.update).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({
        name: 'Updated town',
        description: 'Updated description',
        entities: expect.arrayContaining([
          { kind: 'note', id: 'note-1' },
          { kind: 'module', id: 'module-2' },
        ]),
      }),
    );
    wrapper.unmount();
  });

  it('blocks saving without a location name', async () => {
    mocks.locationStore.getById.mockReturnValue(location);
    mocks.locationStore.items = [location];

    const wrapper = mountLocationView();
    await flushPromises();

    await wrapper.find('.entity-edit-mode').trigger('click');
    await nextTick();
    await wrapper.find('.entity-inline-editor input').setValue('   ');
    await wrapper.find('.entity-view-mode').trigger('click');
    await flushPromises();

    expect(mocks.alert).toHaveBeenCalled();
    expect(wrapper.find('.entity-edit-mode').attributes('aria-pressed')).toBe(
      'true',
    );
    wrapper.unmount();
  });

  it('updates view checkboxes, same-length link changes and save failures', async () => {
    const current = {
      ...location,
      description: 'A busy port.',
    };
    mocks.locationStore.getById.mockReturnValue(current);
    mocks.locationStore.items = [current];

    const wrapper = mountLocationView();
    await flushPromises();

    wrapper
      .findComponent({ name: 'Markdown' })
      .vm.$emit('update:content', 'Checked via Markdown');
    await flushPromises();
    expect(mocks.locationStore.update).toHaveBeenCalledWith('l1', {
      description: 'Checked via Markdown',
    });

    await wrapper.find('.entity-edit-mode').trigger('click');
    await nextTick();
    const noteBlock = wrapper
      .findAllComponents(EntitiesLinkingStub)
      .find((block) => block.props('kind') === 'note')!;
    noteBlock.vm.$emit('update:modelValue', [{ kind: 'note', id: 'note-2' }]);
    await nextTick();
    await wrapper.find('.entity-view-mode').trigger('click');
    await flushPromises();
    expect(mocks.locationStore.update).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({
        entities: [{ kind: 'note', id: 'note-2' }],
      }),
    );

    await wrapper.find('.entity-edit-mode').trigger('click');
    await nextTick();
    wrapper
      .findAllComponents(EntitiesLinkingStub)
      .find((block) => block.props('kind') === 'note')!
      .vm.$emit('update:modelValue', [{ kind: 'note', id: 'note-3' }]);
    await nextTick();

    mocks.locationStore.update.mockRejectedValueOnce('boom');
    await wrapper.find('.entity-view-mode').trigger('click');
    await flushPromises();
    expect(wrapper.find('.entity-edit-mode').attributes('aria-pressed')).toBe(
      'true',
    );

    mocks.locationStore.update.mockRejectedValueOnce(new Error('failed'));
    await wrapper.find('.entity-view-mode').trigger('click');
    await flushPromises();
    expect(wrapper.find('.entity-edit-mode').attributes('aria-pressed')).toBe(
      'true',
    );
    mocks.locationStore.update.mockResolvedValue(undefined);
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

    const backlinkItems = backlinks.findAll('[data-stub="QItem"]');
    await backlinkItems[0].trigger('click');
    expect(mocks.push).toHaveBeenCalledWith('/locations/l2');
    await backlinkItems[1].trigger('click');
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

    mocks.push.mockClear();
    await backlinks.find('.cursor-pointer').trigger('click');
    expect(mocks.push).toHaveBeenCalledWith('/locations/l2');
    const backlinkItems = backlinks.findAll('[data-stub="QItem"]');
    await backlinkItems[0].trigger('click');
    expect(mocks.push).toHaveBeenCalledWith('/locations/l2');
    await backlinkItems[1].trigger('click');
    expect(mocks.push).toHaveBeenCalledWith('/locations/l2');
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
    const mapSidebar = wrapper.find('#location-map-sidebar');
    expect(mapSidebar.exists()).toBe(true);
    expect((mapSidebar.element as HTMLElement).style.display).toBe('none');
    expect(wrapper.find('.scenes-stub').exists()).toBe(true);
    wrapper.unmount();
  });
});
