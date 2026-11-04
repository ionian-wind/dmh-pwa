import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import NoteViewSidebar from '@/notes/NoteViewSidebar.vue';

const RouterLinkStub = {
  props: ['to'],
  template: '<a class="tag-link"><slot /></a>',
};

describe('NoteViewSidebar', () => {
  it('renders note tags', () => {
    const wrapper = mount(NoteViewSidebar, {
      props: {
        note: { id: 'n1', title: 'Note', tags: ['combat', 'npc'] } as any,
      },
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    expect(wrapper.findAll('.tag-link')).toHaveLength(2);
    wrapper.unmount();
  });

  it('skips tags when absent', () => {
    const wrapper = mount(NoteViewSidebar, {
      props: { note: { id: 'n1', title: 'Note' } as any },
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    expect(wrapper.find('.tags-section').exists()).toBe(false);
    wrapper.unmount();
  });
});
