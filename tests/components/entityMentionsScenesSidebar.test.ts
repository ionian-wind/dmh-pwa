import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  load: vi.fn().mockResolvedValue(undefined),
  getLinks: vi.fn(() => [{ kind: 'note', id: 'n1' }]),
  getBacklinks: vi.fn(() => [{ kind: 'note', id: 'n2' }]),
}));

vi.mock('@/utils/storage', () => ({
  useMentionsStore: () => mocks,
}));

import EntityMentionsScenesSidebar from '@/components/common/EntityMentionsScenesSidebar.vue';

const MentionsStub = defineComponent({
  name: 'Mentions',
  props: { title: String, entities: Array },
  setup(props) {
    return () =>
      h('div', { class: 'mentions-stub', 'data-title': props.title });
  },
});

const ScenesStub = defineComponent({
  name: 'EntityScenesPanel',
  props: { entityType: String, entityId: String },
  setup() {
    return () => h('div', { class: 'scenes-stub' });
  },
});

function mountSidebar(entityId = 'mo1') {
  return mount(EntityMentionsScenesSidebar, {
    props: { entityType: 'monster', entityId },
    global: {
      stubs: { Mentions: MentionsStub, EntityScenesPanel: ScenesStub },
    },
  });
}

describe('EntityMentionsScenesSidebar', () => {
  it('separates mentions and scenes into tabs', async () => {
    const wrapper = mountSidebar();
    await flushPromises();

    expect(wrapper.find('.tab-group').exists()).toBe(true);
    const tabs = wrapper.findAll('.tab-item');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].text()).toContain('Mentions');
    expect(tabs[1].text()).toContain('Scenes');

    const mentions = wrapper.findAllComponents(MentionsStub);
    expect(mentions).toHaveLength(2);
    expect(mentions[0].props('entities')).toEqual([{ kind: 'note', id: 'n1' }]);
    expect(mentions[1].props('entities')).toEqual([{ kind: 'note', id: 'n2' }]);
    expect(wrapper.findComponent(ScenesStub).props()).toMatchObject({
      entityType: 'monster',
      entityId: 'mo1',
    });
    expect(mocks.getLinks).toHaveBeenCalledWith({
      kind: 'monster',
      id: 'mo1',
    });
    expect(mocks.load).toHaveBeenCalled();

    const panels = wrapper.findAll('.tab-content > div');
    expect((panels[0].element as HTMLElement).style.display).not.toBe('none');
    expect((panels[1].element as HTMLElement).style.display).toBe('none');

    await tabs[1].trigger('click');
    expect((panels[0].element as HTMLElement).style.display).toBe('none');
    expect((panels[1].element as HTMLElement).style.display).not.toBe('none');
    wrapper.unmount();
  });

  it('renders empty mentions and no scenes without an entity id', () => {
    const wrapper = mountSidebar('');

    const mentions = wrapper.findAllComponents(MentionsStub);
    expect(mentions[0].props('entities')).toEqual([]);
    expect(mentions[1].props('entities')).toEqual([]);
    expect(wrapper.findComponent(ScenesStub).exists()).toBe(false);
    wrapper.unmount();
  });
});
