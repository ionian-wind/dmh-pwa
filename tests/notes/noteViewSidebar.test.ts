import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
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
    expect(wrapper.find('.entity-group').exists()).toBe(true);
    const tabs = wrapper.findAll('.tab-item');
    expect(tabs.map((tab) => tab.text())).toEqual(['Tags', 'Mentions']);
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

  it('switches from the tags tab to mentions', async () => {
    const wrapper = mount(NoteViewSidebar, {
      props: {
        note: { id: 'n1', title: 'Note', tags: ['combat'] } as any,
      },
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    const panels = wrapper.findAll('.tab-content > div');
    expect((panels[0].element as HTMLElement).style.display).not.toBe('none');
    expect((panels[1].element as HTMLElement).style.display).toBe('none');

    await wrapper.findAll('.tab-item')[1].trigger('click');
    await nextTick();
    expect((panels[0].element as HTMLElement).style.display).toBe('none');
    expect((panels[1].element as HTMLElement).style.display).not.toBe('none');
    wrapper.unmount();
  });

  it('shows a local view/edit mode switch without wiring it to the note', async () => {
    const wrapper = mount(NoteViewSidebar, {
      props: { note: { id: 'n1', title: 'Note', tags: [] } as any },
    });

    const view = wrapper.find('.note-view-mode');
    const edit = wrapper.find('.note-edit-mode');
    expect(view.attributes('aria-pressed')).toBe('true');
    expect(edit.attributes('aria-pressed')).toBe('false');

    await edit.trigger('click');
    expect(view.attributes('aria-pressed')).toBe('false');
    expect(edit.attributes('aria-pressed')).toBe('true');

    await view.trigger('click');
    expect(view.attributes('aria-pressed')).toBe('true');
    expect(edit.attributes('aria-pressed')).toBe('false');
    wrapper.unmount();
  });
});
