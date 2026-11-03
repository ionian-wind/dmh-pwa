import { describe, expect, it, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import BaseEntityView from '@/components/common/BaseEntityView.vue';
import { createLayoutStore, LayoutKey } from '@/composables/useLayout';

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/things', component: { render: () => h('div') } }],
  });
}

function mountView(
  props: Record<string, any> = {},
  slots: Record<string, any> = {},
) {
  const layout = createLayoutStore();
  const router = makeRouter();
  const wrapper = mount(BaseEntityView, {
    props: {
      entity: { id: '1' },
      entityName: 'thing',
      listRoute: '/things',
      ...props,
    },
    slots,
    global: {
      plugins: [router],
      provide: { [LayoutKey]: layout },
    },
  });
  return { wrapper, layout, router };
}

describe('BaseEntityView', () => {
  it('exposes header callbacks and a sidepanel host', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn().mockResolvedValue(true);
    const rightDrawerIcon = { name: 'drawer-icon' };
    const { wrapper, layout, router } = mountView(
      {
        title: 'Title',
        subtitle: 'Subtitle',
        headerButtons: [{ title: 'Action' }],
        rightDrawerIcon,
        onEdit,
        onDelete,
      },
      {
        default: 'Body',
        sub: 'SUB',
        actions: 'ACTIONS',
        sidepanel: 'SIDE',
      },
    );
    const push = vi.spyOn(router, 'push');
    await nextTick();

    const header = layout.topMenuContent.value?.props;
    expect(header?.title).toBe('Title');
    expect(header?.subtitle).toBe('Subtitle');
    expect(header?.buttons).toHaveLength(1);
    expect(header?.rightDrawerIcon).toEqual(rightDrawerIcon);

    header?.onEdit();
    expect(onEdit).toHaveBeenCalledTimes(1);

    await header?.onDelete();
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/things');

    expect(wrapper.text()).toContain('SUB');
    expect(wrapper.text()).toContain('ACTIONS');
    expect(wrapper.find('.entity-content').text()).toContain('Body');

    const host = layout.rightDrawerContent.value?.component as any;
    expect(host).toBeTruthy();
    const render = host.setup();
    expect(render()).toBeTruthy();

    wrapper.unmount();
    expect(layout.topMenuContent.value).toBeNull();
    expect(layout.rightDrawerContent.value).toBeNull();
  });

  it('does not navigate when deletion fails or is missing', async () => {
    const onDelete = vi.fn().mockResolvedValue(false);
    const { wrapper, layout, router } = mountView({ onDelete });
    const push = vi.spyOn(router, 'push');
    await nextTick();

    await layout.topMenuContent.value?.props?.onDelete();
    expect(push).not.toHaveBeenCalled();

    layout.topMenuContent.value?.props?.onEdit();
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('supports loading, not-found and unwrapped content states', async () => {
    const loading = mountView({ loading: true });
    await nextTick();
    expect(loading.wrapper.find('.loading-state').exists()).toBe(true);
    expect(loading.wrapper.text()).toContain('Loading');
    loading.wrapper.unmount();

    const missing = mountView({ notFound: true });
    await nextTick();
    expect(missing.wrapper.text()).toContain('404');
    missing.wrapper.unmount();

    const empty = mountView({ entity: null });
    await nextTick();
    expect(empty.wrapper.text()).toBe('');
    empty.wrapper.unmount();

    const unwrapped = mountView({ unwrapContent: true }, { default: 'RAW' });
    await nextTick();
    expect(unwrapped.wrapper.find('.entity-content').exists()).toBe(false);
    expect(unwrapped.wrapper.text()).toContain('RAW');
    unwrapped.wrapper.unmount();
  });

  it('hides the header and drawer when requested', async () => {
    const { wrapper, layout } = mountView({ hideHeader: true });
    await nextTick();

    expect(layout.topMenuContent.value).toBeNull();
    expect(layout.rightDrawerContent.value).toBeNull();
    wrapper.unmount();
  });
});
