import { mount, flushPromises } from '@vue/test-utils';
import NoteTypeSelector from '../../src/notes/NoteTypeSelector.vue';
import { vi } from 'vitest';

vi.mock('@/stores/noteTypes', () => ({
  useNoteTypeStore: () => ({
    noteTypes: [
      { id: 't1', name: 'Type One', description: '', color: '#fff', icon: '', fields: [] },
      { id: 't2', name: 'Type Two', description: '', color: '#000', icon: '', fields: [] }
    ],
    loadNoteTypes: vi.fn(),
    addNoteType: vi.fn(),
    deleteNoteType: vi.fn()
  })
}));

describe('NoteTypeSelector', () => {
  it('renders options and placeholder', () => {
    const wrapper = mount(NoteTypeSelector, { props: { modelValue: null } });
    const options = wrapper.findAll('option');
    expect(options[0].text()).toContain('Select note type');
    expect(options[1].text()).toContain('Type One');
    expect(options[2].text()).toContain('Type Two');
  });

  it('emits update:modelValue when selection changes', async () => {
    const wrapper = mount(NoteTypeSelector, { props: { modelValue: null } });
    await wrapper.find('select').setValue('t2');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0][0]).toBe('t2');
  });

  it('shows type editor when add button is clicked', async () => {
    const wrapper = mount(NoteTypeSelector, { props: { modelValue: null } });
    await wrapper.find('.add-type-btn').trigger('click');
    expect(wrapper.find('.type-editor').exists()).toBe(true);
  });

  it('calls addNoteType when Add is clicked in editor', async () => {
    const wrapper = mount(NoteTypeSelector, { props: { modelValue: null } });
    await wrapper.find('.add-type-btn').trigger('click');
    await wrapper.find('input#type-name').setValue('New Type');
    await wrapper.find('.type-editor-actions button').trigger('click');
    const store = require('@/stores/noteTypes').useNoteTypeStore();
    expect(store.addNoteType).toHaveBeenCalled();
  });

  it('calls deleteNoteType when remove button is clicked', async () => {
    window.confirm = vi.fn(() => true);
    const wrapper = mount(NoteTypeSelector, { props: { modelValue: null } });
    await wrapper.findAll('.remove-type-btn')[0].trigger('click');
    const store = require('@/stores/noteTypes').useNoteTypeStore();
    expect(store.deleteNoteType).toHaveBeenCalledWith('t1');
  });
}); 
