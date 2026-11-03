import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const noteStore = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock('@/stores/notes', () => ({
  useNoteStore: () => noteStore,
}));

vi.mock('@/notes/NoteEditor.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'NoteEditor',
    props: {
      note: { type: Object, default: null },
      isOpen: Boolean,
      useModalStack: Boolean,
    },
    emits: ['submit', 'cancel'],
    setup(_, { emit }) {
      return () =>
        h(
          'button',
          {
            class: 'note-editor-submit',
            onClick: () =>
              emit('submit', {
                id: '',
                title: 'Created note',
                content: '',
                contentType: 'text',
                tags: [],
                hidden: false,
                createdAt: 0,
                updatedAt: 0,
              }),
          },
          'save',
        );
    },
  }),
}));

import EntityCreateDialog from '@/maps/components/EntityCreateDialog.vue';

describe('EntityCreateDialog', () => {
  beforeEach(() => {
    noteStore.create.mockReset();
    noteStore.create.mockImplementation(async (data: any) => ({
      ...data,
      id: 'note-1',
    }));
  });

  it('creates a related note and emits it as created', async () => {
    const wrapper = mount(EntityCreateDialog, {
      props: { kind: 'note' },
    });
    await flushPromises();

    const submit = wrapper.find('.note-editor-submit');
    expect(submit.exists()).toBe(true);
    await submit.trigger('click');
    await flushPromises();

    expect(noteStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Created note',
        hidden: false,
        contentType: 'text',
      }),
    );
    expect(wrapper.emitted('created')?.[0]).toEqual([
      {
        ref: { kind: 'note', id: 'note-1' },
        label: 'Created note',
      },
    ]);
    wrapper.unmount();
  });

  it('forwards cancel from the editor', async () => {
    const wrapper = mount(EntityCreateDialog, {
      props: { kind: 'note' },
    });
    await flushPromises();

    wrapper.findComponent({ name: 'NoteEditor' }).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.unmount();
  });
});
