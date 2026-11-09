import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import BaseListView from '@/components/common/BaseListView.vue';
import SortableList from '@/components/common/SortableList.vue';
import { createLayoutStore, LayoutKey } from '@/composables/useLayout';

const CardStub = defineComponent({
  name: 'CardStub',
  props: { item: Object, draggable: Boolean },
  emits: ['view', 'edit', 'delete', 'copy', 'tag-click'],
  setup(_props, { emit }) {
    return () =>
      h('div', { class: 'card-stub' }, [
        h('button', { class: 'view', onClick: () => emit('view') }, 'view'),
        h('button', { class: 'edit', onClick: () => emit('edit') }, 'edit'),
        h('button', { class: 'delete', onClick: () => emit('delete') }, 'del'),
        h('button', { class: 'copy', onClick: () => emit('copy') }, 'copy'),
        h(
          'button',
          { class: 'tag', onClick: () => emit('tag-click', 'tag') },
          'tag',
        ),
      ]);
  },
});

const EditorStub = defineComponent({
  name: 'EditorStub',
  props: { isOpen: Boolean, item: Object },
  emits: ['submit', 'cancel', 'delete'],
  setup(_props, { emit }) {
    return () =>
      h('div', { class: 'editor-stub' }, [
        h(
          'button',
          { class: 'submit', onClick: () => emit('submit', { id: 'new' }) },
          'submit',
        ),
        h(
          'button',
          {
            class: 'submit-meta',
            onClick: () =>
              emit('submit', { id: 'meta' }, { linkedPartyIds: ['p1'] }),
          },
          'submit with meta',
        ),
        h(
          'button',
          { class: 'cancel', onClick: () => emit('cancel') },
          'cancel',
        ),
        h(
          'button',
          { class: 'editor-delete', onClick: () => emit('delete') },
          'delete',
        ),
      ]);
  },
});

function mountList(overrides: Record<string, any> = {}) {
  const layout = createLayoutStore();
  const wrapper = mount(BaseListView, {
    props: {
      items: [{ id: 'a' }, { id: 'b' }],
      cardComponent: CardStub,
      editorComponent: EditorStub,
      emptyMessage: 'Nothing here',
      createTitle: 'Create',
      cardProps: (item: any) => ({ item }),
      editorProps: (item: any) => ({ item }),
      ...overrides,
    },
    global: { provide: { [LayoutKey]: layout } },
  });
  return { wrapper, layout };
}

describe('BaseListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards extra submit metadata from the editor', async () => {
    const { wrapper, layout } = mountList();
    layout.topMenuContent.value?.props?.onCreate();
    await nextTick();

    await wrapper.find('.submit-meta').trigger('click');
    await nextTick();

    expect(wrapper.emitted('submit')?.[0]).toEqual([
      { id: 'meta' },
      { linkedPartyIds: ['p1'] },
    ]);
    wrapper.unmount();
  });

  it('shows the empty state and opens/closes the editor', async () => {
    const { wrapper, layout } = mountList({ items: [] });
    expect(wrapper.text()).toContain('Nothing here');

    layout.topMenuContent.value?.props?.onCreate();
    await nextTick();
    expect(wrapper.findComponent(EditorStub).props('isOpen')).toBe(true);

    await wrapper.findComponent(EditorStub).find('.submit').trigger('click');
    await nextTick();
    expect(wrapper.emitted('submit')?.[0]).toEqual([{ id: 'new' }]);
    expect(wrapper.findComponent(EditorStub).exists()).toBe(false);

    layout.topMenuContent.value?.props?.onCreate();
    await nextTick();
    await wrapper.findComponent(EditorStub).find('.cancel').trigger('click');
    await nextTick();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('splits empty messages into title and subtitle', () => {
    const { wrapper } = mountList({
      items: [],
      emptyMessage: 'Nothing here. Add your first item to get started!',
    });
    expect(wrapper.find('.empty-state .text-subtitle1').text()).toBe(
      'Nothing here',
    );
    expect(wrapper.find('.empty-state .text-caption').text()).toBe(
      'Add your first item to get started!',
    );
    wrapper.unmount();
  });

  it('renders masonry cards and forwards all card events', async () => {
    const { wrapper } = mountList();
    expect(wrapper.findAll('.card-stub')).toHaveLength(2);
    expect(wrapper.find('.col-lg-3').exists()).toBe(true);

    const card = wrapper.find('.card-stub');
    await card.find('.view').trigger('click');
    await card.find('.edit').trigger('click');
    await card.find('.delete').trigger('click');
    await card.find('.copy').trigger('click');
    await card.find('.tag').trigger('click');

    expect(wrapper.emitted('view')?.[0]).toEqual([{ id: 'a' }]);
    expect(wrapper.emitted('edit')?.[0]).toEqual([{ id: 'a' }]);
    expect(wrapper.emitted('delete')?.[0]).toEqual([{ id: 'a' }]);
    expect(wrapper.emitted('copy')?.[0]).toEqual([{ id: 'a' }]);
    expect(wrapper.emitted('tag-click')?.[0]).toEqual(['tag']);
  });

  it('does not double-fire delete through card props', async () => {
    const onDelete = vi.fn();
    const { wrapper } = mountList({
      cardProps: (item: any) => ({ item, onDelete }),
    });

    await wrapper.find('.card-stub .delete').trigger('click');

    expect(onDelete).not.toHaveBeenCalled();
    expect(wrapper.emitted('delete')?.[0]).toEqual([{ id: 'a' }]);
  });

  it('supports grid and list layouts and forwards drag events', async () => {
    const grid = mountList({ viewStyle: 'grid' });
    expect(grid.wrapper.find('.col-lg-4').exists()).toBe(true);

    const list = mountList({ viewStyle: 'simple-list' });
    expect(list.wrapper.find('.simple-list').exists()).toBe(true);

    await list.wrapper
      .find('.base-list-container')
      .trigger('drop', { dataTransfer: {} });
    await list.wrapper
      .find('.base-list-container')
      .trigger('dragover', { dataTransfer: {} });
    await list.wrapper
      .find('.base-list-container')
      .trigger('dragleave', { dataTransfer: {} });

    expect(list.wrapper.emitted('drop')).toHaveLength(1);
    expect(list.wrapper.emitted('dragover')).toHaveLength(1);
    expect(list.wrapper.emitted('dragleave')).toHaveLength(1);
  });

  it('keeps header props in sync and clears them on unmount', async () => {
    const leftHeaderButtons = [
      {
        icon: { name: 'left' },
        color: 'primary',
        title: 'left',
        event: vi.fn(),
      },
    ];
    const tabs = [
      { id: 'jukebox', label: 'Jukebox' },
      { id: 'ambient', label: 'Ambience' },
    ];
    const { wrapper, layout } = mountList({
      searchQuery: 'first',
      showSearch: true,
      rightDrawerIcon: { name: 'icon' },
      leftHeaderButtons,
      createLoading: true,
      tabs,
      activeTab: 'jukebox',
    });

    const header = layout.topMenuContent.value;
    expect(header?.props?.searchQuery).toBe('first');
    expect(header?.props?.rightDrawerIcon).toEqual({ name: 'icon' });
    expect(header?.props?.leftButtons).toEqual(leftHeaderButtons);
    expect(header?.props?.createLoading).toBe(true);
    expect(header?.props?.tabs).toEqual(tabs);
    expect(header?.props?.modelValue).toBe('jukebox');

    header?.props?.['onUpdate:searchQuery']?.('second');
    expect(wrapper.emitted('update:searchQuery')?.[0]).toEqual(['second']);

    header?.props?.onTabClick?.(tabs[1]);
    expect(wrapper.emitted('tab-click')?.[0]).toEqual([tabs[1]]);
    header?.props?.['onUpdate:modelValue']?.('ambient');
    expect(wrapper.emitted('update:activeTab')?.[0]).toEqual(['ambient']);

    await wrapper.setProps({
      searchQuery: 'third',
      createTitle: 'Updated',
      activeTab: 'ambient',
    });
    await flushPromises();
    expect(layout.topMenuContent.value?.props?.searchQuery).toBe('third');
    expect(layout.topMenuContent.value?.props?.createTitle).toBe('Updated');
    expect(layout.topMenuContent.value?.props?.modelValue).toBe('ambient');

    wrapper.unmount();
    expect(layout.topMenuContent.value).toBeNull();
  });

  it('hides the header when requested', () => {
    const { layout } = mountList({ hideHeader: true });
    expect(layout.topMenuContent.value).toBeNull();
  });

  it('forwards card events from grid and simple-list layouts', async () => {
    for (const viewStyle of ['grid', 'simple-list']) {
      const { wrapper } = mountList({ viewStyle });
      const card = wrapper.find('.card-stub');
      await card.find('.view').trigger('click');
      await card.find('.edit').trigger('click');
      await card.find('.delete').trigger('click');
      await card.find('.copy').trigger('click');
      await card.find('.tag').trigger('click');

      expect(wrapper.emitted('view')?.[0]).toEqual([{ id: 'a' }]);
      expect(wrapper.emitted('edit')?.[0]).toEqual([{ id: 'a' }]);
      expect(wrapper.emitted('delete')?.[0]).toEqual([{ id: 'a' }]);
      expect(wrapper.emitted('copy')?.[0]).toEqual([{ id: 'a' }]);
      expect(wrapper.emitted('tag-click')?.[0]).toEqual(['tag']);
      wrapper.unmount();
    }
  });

  it('forwards card events from the draggable layout and emits sort', async () => {
    const { wrapper } = mountList({
      draggable: true,
      dragHandle: '.drag-handle',
    });
    const card = wrapper.find('.card-stub');
    expect(wrapper.findComponent(CardStub).props('draggable')).toBe(true);
    expect(wrapper.findComponent(SortableList).props('handle')).toBe(
      '.drag-handle',
    );
    await card.find('.view').trigger('click');
    await card.find('.edit').trigger('click');
    await card.find('.delete').trigger('click');
    await card.find('.copy').trigger('click');
    await card.find('.tag').trigger('click');

    expect(wrapper.emitted('view')?.[0]).toEqual([{ id: 'a' }]);

    const draggable = wrapper.findComponent(SortableList);
    expect(draggable.exists()).toBe(true);
    draggable.vm.$emit('update:modelValue', [{ id: 'b' }, { id: 'a' }]);
    await nextTick();
    draggable.vm.$emit('end', { oldIndex: 0, newIndex: 1 });
    expect(wrapper.emitted('sort')?.[0]?.[0]).toEqual([
      { id: 'b' },
      { id: 'a' },
    ]);

    draggable.vm.$emit('end', { oldIndex: 1, newIndex: 1 });
    expect(wrapper.emitted('sort')).toHaveLength(1);
    wrapper.unmount();
  });

  it('closes the editor when deleting through it', async () => {
    const { wrapper, layout } = mountList();
    layout.topMenuContent.value?.props?.onCreate();
    await nextTick();

    await wrapper
      .findComponent(EditorStub)
      .find('.editor-delete')
      .trigger('click');
    await nextTick();

    expect(wrapper.emitted('delete')?.[0]).toEqual([null]);
    expect(wrapper.findComponent(EditorStub).exists()).toBe(false);
    wrapper.unmount();
  });

  it('offers a create button in the empty state', async () => {
    const { wrapper } = mountList({ items: [] });

    const create = wrapper.find('.empty-state-create');
    expect(create.exists()).toBe(true);
    expect(create.text()).toContain('Create');
    expect(create.find('[data-stub="QIcon"]').exists()).toBe(true);

    await create.trigger('click');
    await nextTick();
    expect(wrapper.emitted('create')).toHaveLength(1);
    expect(wrapper.findComponent(EditorStub).props('isOpen')).toBe(true);
    wrapper.unmount();
  });

  it('uses a custom empty-state action title', () => {
    const { wrapper } = mountList({
      items: [],
      emptyActionTitle: 'Add',
    });

    expect(wrapper.find('.empty-state-create').text()).toContain('Add');
    wrapper.unmount();
  });
});
