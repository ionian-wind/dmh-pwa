import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import NoteViewSidebar from '@/notes/NoteViewSidebar.vue';

const mentions = vi.hoisted(() => ({
  getLinks: vi.fn(() => [{ kind: 'note', id: 'n2' }]),
  getBacklinks: vi.fn(() => [{ kind: 'note', id: 'n3' }]),
  load: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/storage', () => ({
  useMentionsStore: () => mentions,
}));

const RouterLinkStub = {
  props: ['to'],
  template: '<a class="tag-link"><slot /></a>',
};

const MentionsStub = {
  props: ['title', 'entities'],
  template: '<div class="mentions-stub">{{ title }}</div>',
};

describe('NoteViewSidebar', () => {
  it('renders tags and mention lists', () => {
    const wrapper = mount(NoteViewSidebar, {
      props: {
        note: { id: 'n1', title: 'Note', tags: ['combat', 'npc'] } as any,
      },
      global: {
        stubs: { RouterLink: RouterLinkStub, Mentions: MentionsStub },
      },
    });
    expect(mentions.load).toHaveBeenCalled();
    expect(wrapper.findAll('.tag-link')).toHaveLength(2);
    expect(wrapper.findAll('.mentions-stub')).toHaveLength(2);
    wrapper.unmount();
  });

  it('skips tags when absent and handles empty mentions', () => {
    mentions.getLinks.mockReturnValueOnce([]);
    mentions.getBacklinks.mockReturnValueOnce([]);
    const wrapper = mount(NoteViewSidebar, {
      props: { note: { id: 'n1', title: 'Note' } as any },
      global: {
        stubs: { RouterLink: RouterLinkStub, Mentions: MentionsStub },
      },
    });
    expect(wrapper.find('.tags-section').exists()).toBe(false);
    expect(wrapper.findAll('.mentions-stub')).toHaveLength(2);
    wrapper.unmount();
  });
});
