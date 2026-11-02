import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import BaseListView from '@/components/common/BaseListView.vue';
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
  emits: ['submit', 'cancel'],
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
          { class: 'cancel', onClick: () => emit('cancel') },
          'cancel',
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
    const { wrapper, layout } = mountList({
      searchQuery: 'first',
      showSearch: true,
      rightDrawerIcon: { name: 'icon' },
    });

    const header = layout.topMenuContent.value;
    expect(header?.props?.searchQuery).toBe('first');
    expect(header?.props?.rightDrawerIcon).toEqual({ name: 'icon' });

    header?.props?.['onUpdate:searchQuery']?.('second');
    expect(wrapper.emitted('update:searchQuery')?.[0]).toEqual(['second']);

    await wrapper.setProps({ searchQuery: 'third', createTitle: 'Updated' });
    await flushPromises();
    expect(layout.topMenuContent.value?.props?.searchQuery).toBe('third');
    expect(layout.topMenuContent.value?.props?.createTitle).toBe('Updated');

    wrapper.unmount();
    expect(layout.topMenuContent.value).toBeNull();
  });

  it('hides the header when requested', () => {
    const { layout } = mountList({ hideHeader: true });
    expect(layout.topMenuContent.value).toBeNull();
  });
});
