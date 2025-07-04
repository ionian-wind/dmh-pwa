import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import NoteEditor from '../../src/notes/NoteEditor.vue';

vi.mock('@/components/ModuleSelector.vue', () => ({
  __esModule: true,
  default: { name: 'ModuleSelector', template: '<div />' }
}));
vi.mock('@/components/TagSelector.vue', () => ({
  __esModule: true,
  default: { name: 'TagSelector', template: '<div />' }
}));
vi.mock('@/components/NoteTypeSelector.vue', () => ({
  __esModule: true,
  default: { name: 'NoteTypeSelector', template: '<div />' }
}));
vi.mock('@/components/common/BaseModal.vue', () => ({
  __esModule: true,
  default: { name: 'BaseModal', template: '<div><slot /><slot name="editor" /></div>' }
}));
vi.mock('@/components/common/Button.vue', () => ({
  __esModule: true,
  default: { name: 'Button', template: '<button><slot /></button>' }
}));

window.alert = vi.fn();

describe('NoteEditor', () => {
  const note = {
    id: 'n1',
    title: 'Test Note',
    content: 'Some content',
    tags: ['tag1'],
    moduleId: 'mod-1',
    typeId: 'type-1',
    createdAt: 0,
    updatedAt: 0
  };

  it('renders with note data', () => {
    const wrapper = mount(NoteEditor, {
      props: { note, isOpen: true }
    });
    expect(wrapper.find('input#title').element.value).toBe('Test Note');
    expect(wrapper.find('textarea').element.value).toBe('Some content');
  });

  it('emits submit with edited note', async () => {
    const wrapper = mount(NoteEditor, {
      props: { note, isOpen: true }
    });
    await wrapper.find('input#title').setValue('Changed');
    await wrapper.find('textarea').setValue('Changed content');
    await wrapper.vm.handleSubmit();
    expect(wrapper.emitted('submit')).toBeTruthy();
    expect(wrapper.emitted('submit')[0][0].title).toBe('Changed');
    expect(wrapper.emitted('submit')[0][0].content).toBe('Changed content');
  });

  it('emits cancel on cancel', async () => {
    const wrapper = mount(NoteEditor, {
      props: { note, isOpen: true }
    });
    await wrapper.vm.handleCancel();
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('shows alert if title is missing on submit', async () => {
    const wrapper = mount(NoteEditor, {
      props: { note: { ...note, title: '' }, isOpen: true }
    });
    await wrapper.vm.handleSubmit();
    expect(window.alert).toHaveBeenCalledWith('Title is required');
  });

  it('shows formatting help and autosuggest', async () => {
    const wrapper = mount(NoteEditor, {
      props: { note, isOpen: true }
    });
    expect(wrapper.text()).toContain('Formatting Help');
    // Simulate input triggering autosuggest
    const textarea = wrapper.find('textarea');
    textarea.element.value = '[[note:';
    await textarea.trigger('input');
    expect(wrapper.vm.showAutosuggest).toBe(true);
  });
}); 
