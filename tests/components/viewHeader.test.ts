import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { mount } from '@vue/test-utils';

import ViewHeader from '@/components/common/ViewHeader.vue';
import { createLayoutStore, LayoutKey } from '@/composables/useLayout';

const customIcon = { render: () => h('span', { class: 'custom-icon' }) };

function mountHeader(overrides: Record<string, any> = {}) {
  const layout = createLayoutStore();
  layout.setRightDrawerContent({ component: { render: () => null } });
  const wrapper = mount(ViewHeader, {
    props: {
      title: 'Header',
      buttons: [
        {
          icon: customIcon,
          color: 'primary',
          title: 'common.bookmark',
          event: vi.fn(),
        },
      ],
      showCreate: true,
      onCreate: vi.fn(),
      showEdit: true,
      onEdit: vi.fn(),
      showDelete: true,
      onDelete: vi.fn(),
      ...overrides,
    },
    global: { provide: { [LayoutKey]: layout } },
  });
  return { wrapper, layout };
}

describe('ViewHeader action buttons', () => {
  it('renders custom, CRUD and drawer actions in one button group', async () => {
    const { wrapper, layout } = mountHeader();
    const groups = wrapper.findAll('[data-stub="QBtnGroup"]');

    expect(groups).toHaveLength(3);
    expect(wrapper.findAll('[data-stub="QSeparator"]')).toHaveLength(1);

    const deleteButton = groups[0].find('button');
    expect(deleteButton.attributes('aria-label')).toBe('Delete');

    const buttons = groups[1].findAll('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0].attributes('aria-label')).toBe('Bookmark');
    expect(buttons[1].attributes('aria-label')).toBe('Create');
    expect(buttons[2].attributes('aria-label')).toBe('Edit');

    const drawerButton = groups[2].find('button');
    expect(drawerButton.attributes('aria-label')).toBe('Toggle sidebar');

    const props = wrapper.props() as any;
    await buttons[0].trigger('click');
    expect(props.buttons[0].event).toHaveBeenCalledTimes(1);

    await buttons[1].trigger('click');
    expect(props.onCreate).toHaveBeenCalledTimes(1);
    await buttons[2].trigger('click');
    expect(props.onEdit).toHaveBeenCalledTimes(1);
    await deleteButton.trigger('click');
    expect(props.onDelete).toHaveBeenCalledTimes(1);

    expect(layout.rightDrawerOpen.value).toBe(true);
    await drawerButton.trigger('click');
    expect(layout.rightDrawerOpen.value).toBe(false);
  });

  it('disables edit while editing and renders no group without actions', () => {
    const { wrapper } = mountHeader({ isEditing: true });
    const buttons = wrapper
      .findAll('[data-stub="QBtnGroup"]')[1]
      .findAll('button');
    expect(buttons[2].attributes('disabled')).toBeDefined();

    const emptyLayout = createLayoutStore();
    const empty = mount(ViewHeader, {
      props: { buttons: [] },
      global: { provide: { [LayoutKey]: emptyLayout } },
    });
    expect(empty.findAll('[data-stub="QBtnGroup"]')).toHaveLength(0);
  });

  it('renders only the drawer group without a separator when there are no actions', () => {
    const { wrapper } = mountHeader({
      buttons: [],
      showCreate: false,
      showEdit: false,
      showDelete: false,
    });

    expect(wrapper.findAll('[data-stub="QBtnGroup"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-stub="QSeparator"]')).toHaveLength(0);
    expect(wrapper.find('button').attributes('aria-label')).toBe(
      'Toggle sidebar',
    );
  });

  it('renders page tabs in the header and forwards selection', async () => {
    const tabs = [
      { id: 'main', label: 'Main editor', icon: customIcon },
      { id: 'links', label: 'Linked entities', disabled: true },
    ];
    const { wrapper } = mountHeader({
      title: '',
      tabs,
      modelValue: 'main',
    });

    const tabComponents = wrapper.findAll('[data-stub="QTab"]');
    expect(tabComponents).toHaveLength(2);
    expect(tabComponents[0].attributes('title')).toBe('Main editor');
    expect(tabComponents[0].attributes('aria-label')).toBe('Main editor');
    expect(tabComponents[1].attributes('title')).toBe('Linked entities');
    expect(wrapper.find('.custom-icon').exists()).toBe(true);

    wrapper
      .findComponent({ name: 'QTabs' })
      .vm.$emit('update:modelValue', 'links');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['links']);

    wrapper.findAllComponents({ name: 'QTab' })[0].vm.$emit('click');
    expect(wrapper.emitted('tab-click')?.[0]).toEqual([tabs[0]]);
  });

  it('renders custom left buttons before the title and content actions', async () => {
    const leftEvent = vi.fn();
    const customIcon = { render: () => h('span', { class: 'left-icon' }) };
    const { wrapper } = mountHeader({
      leftButtons: [
        {
          icon: customIcon,
          color: 'primary',
          title: 'common.bookmark',
          event: leftEvent,
        },
      ],
    });

    const groups = wrapper.findAll('[data-stub="QBtnGroup"]');
    expect(groups).toHaveLength(4);

    const leftGroup = groups.find((group) =>
      group.find('.left-icon').exists(),
    )!;
    const leftButton = leftGroup.find('button');
    expect(leftButton.attributes('aria-label')).toBe('Bookmark');
    await leftButton.trigger('click');
    expect(leftEvent).toHaveBeenCalledTimes(1);
  });

  it('shows the create action in a disabled loading state', () => {
    const { wrapper } = mountHeader({ createLoading: true });
    const create = wrapper
      .findAll('button')
      .find((button) => button.attributes('aria-label') === 'Create');

    expect(create?.attributes('disabled')).toBeDefined();
    expect(create?.attributes('data-loading')).toBe('true');
  });
});
