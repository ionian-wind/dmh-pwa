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

import CharacterViewSidebar from '@/characters/CharacterViewSidebar.vue';

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

function mountSidebar(character: any) {
  return mount(CharacterViewSidebar, {
    props: { character },
    global: {
      stubs: {
        Mentions: MentionsStub,
        EntityScenesPanel: ScenesStub,
      },
    },
  });
}

describe('CharacterViewSidebar', () => {
  it('uses the shared sidebar layout with mentions and scenes', async () => {
    const wrapper = mountSidebar({ id: 'c1', name: 'Hero' });
    await flushPromises();

    expect(wrapper.find('.tab-group').exists()).toBe(true);
    expect(wrapper.findAll('.tab-item').map((tab) => tab.text())).toEqual([
      'Scenes',
      'Mentions',
    ]);
    const mentions = wrapper.findAllComponents(MentionsStub);
    expect(mentions).toHaveLength(2);
    expect(mentions[0].props('entities')).toEqual([{ kind: 'note', id: 'n1' }]);
    expect(mentions[1].props('entities')).toEqual([{ kind: 'note', id: 'n2' }]);
    expect(wrapper.findComponent(ScenesStub).props()).toMatchObject({
      entityType: 'character',
      entityId: 'c1',
    });
    expect(mocks.getLinks).toHaveBeenCalledWith({
      kind: 'character',
      id: 'c1',
    });
    expect(mocks.getBacklinks).toHaveBeenCalledWith({
      kind: 'character',
      id: 'c1',
    });
    expect(mocks.load).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('renders empty mentions without scenes when character is missing', () => {
    const wrapper = mountSidebar(null);

    const mentions = wrapper.findAllComponents(MentionsStub);
    expect(mentions[0].props('entities')).toEqual([]);
    expect(mentions[1].props('entities')).toEqual([]);
    expect(wrapper.findComponent(ScenesStub).exists()).toBe(false);
    wrapper.unmount();
  });
});
