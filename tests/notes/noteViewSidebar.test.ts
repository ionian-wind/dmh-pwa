import { describe, expect, it, vi } from 'vitest';
import { nextTick, reactive } from 'vue';
import { mount } from '@vue/test-utils';
import NoteViewSidebar from '@/notes/NoteViewSidebar.vue';
import type { Note, NoteEditState } from '@/types';

const downloadNote = vi.hoisted(() => vi.fn());

vi.mock('@/notes/downloadNote', () => ({ downloadNote }));

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

  it('shows note options and the visual editor toggle in edit mode', async () => {
    const note = {
      id: 'n1',
      title: 'Note',
      content: 'Content',
      contentType: 'text',
      tags: [],
      moduleIds: [],
      typeId: null,
      hidden: false,
      createdAt: 1,
      updatedAt: 1,
    } as Note;
    const editState = reactive<NoteEditState>({
      isEditMode: true,
      isVisualMode: true,
      draft: { ...note },
    });
    const setEditMode = vi.fn();

    const wrapper = mount(NoteViewSidebar, {
      props: { note, editState, onSetEditMode: setEditMode },
      global: { stubs: { NoteOptions: true, RouterLink: RouterLinkStub } },
    });

    expect(wrapper.find('.tab-group').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'NoteOptions' }).exists()).toBe(true);
    expect(wrapper.find('.note-visual-mode-toggle').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'QToggle' }).props('modelValue')).toBe(
      true,
    );

    wrapper
      .findComponent({ name: 'QToggle' })
      .vm.$emit('update:modelValue', false);
    expect(editState.isVisualMode).toBe(false);

    await wrapper.find('.note-view-mode').trigger('click');
    expect(setEditMode).toHaveBeenCalledWith(false);

    await wrapper.find('.note-edit-mode').trigger('click');
    expect(setEditMode).toHaveBeenCalledWith(true);
    wrapper.unmount();
  });

  it('downloads the note from a sidebar row in view mode', async () => {
    const note = {
      id: 'n1',
      title: 'Note',
      content: 'Content',
      contentType: 'text',
      tags: [],
    } as Note;
    const editState = reactive<NoteEditState>({
      isEditMode: false,
      isVisualMode: true,
      draft: null,
    });

    const wrapper = mount(NoteViewSidebar, {
      props: { note, editState },
      global: { stubs: { NoteOptions: true, RouterLink: RouterLinkStub } },
    });

    const row = wrapper.find('.note-download');
    expect(row.text()).toContain('Download');
    expect(row.find('svg').exists()).toBe(true);
    await row.trigger('click');
    expect(downloadNote).toHaveBeenCalledWith(note);
    wrapper.unmount();
  });

  it('hides download in edit mode and disables it without a drawing preview', async () => {
    const note = {
      id: 'n1',
      title: 'Sketch',
      content: '',
      contentType: 'draw',
      preview: undefined,
      tags: [],
    } as Note;
    const editState = reactive<NoteEditState>({
      isEditMode: true,
      isVisualMode: true,
      draft: { ...note },
    });

    const wrapper = mount(NoteViewSidebar, {
      props: { note, editState },
      global: { stubs: { NoteOptions: true, RouterLink: RouterLinkStub } },
    });

    expect(wrapper.find('.note-download').exists()).toBe(false);
    editState.isEditMode = false;
    await nextTick();
    await wrapper.find('.note-download').trigger('click');
    expect(downloadNote).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('hides the options panel and visual toggle in view mode', () => {
    const note = {
      id: 'n1',
      title: 'Note',
      tags: [],
    } as Note;
    const editState = reactive<NoteEditState>({
      isEditMode: false,
      isVisualMode: true,
      draft: null,
    });

    const wrapper = mount(NoteViewSidebar, {
      props: { note, editState },
      global: { stubs: { NoteOptions: true, RouterLink: RouterLinkStub } },
    });

    expect(wrapper.findComponent({ name: 'NoteOptions' }).exists()).toBe(false);
    expect(wrapper.find('.note-visual-mode-toggle').exists()).toBe(false);
    expect(wrapper.find('.tab-group').exists()).toBe(true);
    wrapper.unmount();
  });
});
