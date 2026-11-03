import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import NoteTypeSelector from '@/notes/NoteTypeSelector.vue';
import ColorPicker from '@/components/common/ColorPicker.vue';
import IconPicker from '@/components/common/IconPicker.vue';
import { useNoteTypeStore } from '@/stores/noteTypes';
import { quasarStubs } from '../helpers/quasar-stubs';
import { resetMockStores, seedMockStore } from '../helpers/mock-storage';
import { confirm } from '@/dialogs';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));
vi.mock('@/dialogs', () => ({
  confirm: vi.fn(),
  alert: vi.fn(),
  prompt: vi.fn(),
}));

const confirmMock = vi.mocked(confirm);

const QExpansionItem = defineComponent({
  name: 'QExpansionItem',
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  setup(_, { slots }) {
    return () => h('div', [slots.header?.(), slots.default?.()]);
  },
});

const QSelect = quasarStubs.QSelect;
const QInput = quasarStubs.QInput;

function mountSelector(props: Record<string, any> = {}) {
  return mount(NoteTypeSelector, {
    props: { modelValue: null, allowCreate: true, ...props },
    global: {
      stubs: { QExpansionItem },
    },
  });
}

async function createType(wrapper: ReturnType<typeof mountSelector>) {
  await wrapper.find('#type-name').setValue('NPC');
  await wrapper.find('#type-description').setValue('People');
  await wrapper
    .findComponent(ColorPicker)
    .vm.$emit('update:modelValue', '#ff0000');
  await wrapper
    .findComponent(IconPicker)
    .vm.$emit('update:modelValue', 'ra-sword');
  const add = wrapper
    .findAll('button')
    .find((button) => button.text() === 'Add');
  expect(add).toBeTruthy();
  await add!.trigger('click');
  await flushPromises();
}

describe('NoteTypeSelector', () => {
  beforeEach(() => {
    resetMockStores();
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(true);
  });

  it('creates a note type and resets the draft', async () => {
    const wrapper = mountSelector();
    const store = useNoteTypeStore();
    const create = vi.spyOn(store, 'create');

    await createType(wrapper);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'People',
        color: '#ff0000',
        icon: 'ra-sword',
      }),
    );
    expect(store.items).toHaveLength(1);
    expect(store.items[0].name).toBe('NPC');
    wrapper.unmount();
  });

  it('does not create a type without a name', async () => {
    const wrapper = mountSelector();
    const store = useNoteTypeStore();
    const create = vi.spyOn(store, 'create');

    await wrapper.find('#type-name').setValue('   ');
    const add = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add');
    await add!.trigger('click');
    await flushPromises();

    expect(create).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('forwards selection changes and the create toggle', async () => {
    const wrapper = mountSelector();

    await wrapper.findComponent(QSelect).vm.$emit('update:modelValue', 't1');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['t1']);

    const toggle = wrapper
      .findAll('button')
      .find((button) => button.text() === '+');
    expect(toggle).toBeTruthy();
    await toggle!.trigger('click');

    const cancel = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel');
    expect(cancel).toBeTruthy();
    await cancel!.trigger('click');
    wrapper.unmount();
  });

  it('renders RPG Awesome and CSS icon classes', () => {
    seedMockStore('noteTypes', [
      { id: 't1', name: 'Plain', color: '#111111', icon: '' },
      { id: 't2', name: 'Sword', color: '#222222', icon: 'ra-sword' },
      { id: 't3', name: 'Colon', color: '#333333', icon: 'ra:ra-shield' },
      { id: 't4', name: 'Classes', color: '#444444', icon: 'fas fa-dragon' },
      { id: 't5', name: 'Blank', color: '#555555', icon: '   ' },
    ]);
    const wrapper = mountSelector();

    expect(wrapper.findAll('.type-color')).toHaveLength(1);
    const icons = wrapper.findAll('.type-icon');
    expect(icons).toHaveLength(4);
    expect(icons[0].classes()).toContain('ra');
    expect(icons[0].classes()).toContain('ra-sword');
    expect(icons[1].classes()).toContain('ra');
    expect(icons[1].classes()).toContain('ra-shield');
    expect(icons[2].classes()).toEqual(
      expect.arrayContaining(['fas', 'fa-dragon']),
    );
    expect(icons[3].classes()).toEqual(expect.not.arrayContaining(['ra']));
    wrapper.unmount();
  });

  it('deletes a type after confirmation', async () => {
    seedMockStore('noteTypes', [
      { id: 't1', name: 'NPC', color: '#111111', icon: '' },
    ]);
    const wrapper = mountSelector();
    const store = useNoteTypeStore();

    await wrapper.find('.remove-type-btn').trigger('click');
    await flushPromises();

    expect(confirmMock).toHaveBeenCalled();
    expect(store.items).toHaveLength(0);
    wrapper.unmount();
  });

  it('keeps a type when deletion is cancelled', async () => {
    confirmMock.mockResolvedValue(false);
    seedMockStore('noteTypes', [
      { id: 't2', name: 'Keep', color: '#111111', icon: '' },
    ]);
    const wrapper = mountSelector();

    await wrapper.find('.remove-type-btn').trigger('click');
    await flushPromises();

    expect(useNoteTypeStore().items).toHaveLength(1);
    wrapper.unmount();
  });

  it('hides creation controls when creation is disabled', () => {
    const wrapper = mountSelector({ allowCreate: false });
    expect(
      wrapper.findAll('button').some((button) => button.text() === '+'),
    ).toBe(false);
    wrapper.unmount();
  });

  it('accepts direct input events on the draft fields', async () => {
    const wrapper = mountSelector();
    const inputs = wrapper.findAllComponents(QInput);
    await inputs[0].vm.$emit('update:modelValue', 'Direct');
    await inputs[1].vm.$emit('update:modelValue', 'Description');
    await nextTick();
    expect(inputs[0].props('modelValue')).toBe('Direct');
    wrapper.unmount();
  });
});
