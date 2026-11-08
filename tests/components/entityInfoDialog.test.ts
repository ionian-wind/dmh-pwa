import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  update: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouter: () => ({ push: mocks.push }),
}));

const entity = { id: 'c1', name: 'Aria', notes: 'Ranger' };
const entityStore = {
  items: [entity],
  getById: (id: string) => (id === entity.id ? entity : undefined),
  load: vi.fn().mockResolvedValue(undefined),
  update: mocks.update,
};

vi.mock('@/components/common/entityLinking/entityRefs', () => ({
  getEntityKindOption: (kind: string) => ({
    kind,
    titleField: 'name',
    useStore: () => entityStore,
  }),
  entityRoute: (kind: string, id: string) => `/${kind}s/${id}`,
}));

import EntityInfoDialog from '@/components/common/EntityInfoDialog.vue';

const BaseModalStub = defineComponent({
  name: 'BaseModal',
  props: {
    isOpen: Boolean,
    title: String,
    showExpand: Boolean,
    isExpanded: Boolean,
    tabs: Array,
    activeTab: String,
  },
  emits: ['cancel', 'update:isExpanded', 'update:activeTab'],
  setup(_, { slots }) {
    return () =>
      h('div', { class: 'base-modal-stub' }, [
        slots['header-actions']?.(),
        slots['footer']?.(),
        slots['footer-center']?.(),
        slots.main?.(),
        slots.default?.(),
      ]);
  },
});

const EntityPictureStub = defineComponent({
  name: 'EntityPicture',
  props: { picture: String, size: String, alt: String },
  setup: () => () => h('div', { class: 'entity-picture-stub' }),
});

const MilkdownViewStub = defineComponent({
  name: 'MilkdownView',
  props: { content: String },
  setup: () => () => h('div', { class: 'milkdown-view-stub' }),
});

const EntityInlineEditorStub = defineComponent({
  name: 'EntityInlineEditor',
  props: { title: String, titlePlaceholder: String },
  emits: ['update:title'],
  setup(_, { slots }) {
    return () =>
      h('div', { class: 'entity-inline-editor-stub' }, slots.default?.());
  },
});

const EntityMarkdownEditorStub = defineComponent({
  name: 'EntityMarkdownEditor',
  props: {
    modelValue: String,
    isVisualMode: Boolean,
    entityId: String,
    entityType: String,
    placeholder: String,
  },
  emits: ['update:modelValue'],
  setup: () => () => h('div', { class: 'entity-markdown-editor-stub' }),
});

const EntityPicturePickerStub = defineComponent({
  name: 'EntityPicturePicker',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  setup: () => () => h('div', { class: 'entity-picture-picker-stub' }),
});

function mountDialog(props: Record<string, unknown> = {}) {
  return mount(EntityInfoDialog, {
    props: {
      isOpen: true,
      title: 'Aria',
      notes: 'Ranger',
      to: '/characters/c1',
      ...props,
    },
    global: {
      stubs: {
        BaseModal: BaseModalStub,
        EntityPicture: EntityPictureStub,
        MilkdownView: MilkdownViewStub,
        EntityInlineEditor: EntityInlineEditorStub,
        EntityMarkdownEditor: EntityMarkdownEditorStub,
        EntityPicturePicker: EntityPicturePickerStub,
      },
    },
  });
}

describe('EntityInfoDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockResolvedValue({ ...entity });
  });

  it('opens the entity page from the header action', async () => {
    const wrapper = mountDialog();

    await wrapper.find('.entity-info-open').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(mocks.push).toHaveBeenCalledWith('/characters/c1');
    wrapper.unmount();
  });

  it('supports expanding the dialog', async () => {
    const wrapper = mountDialog();
    const modal = wrapper.findComponent(BaseModalStub);

    expect(modal.props('showExpand')).toBe(true);
    modal.vm.$emit('update:isExpanded', true);
    await nextTick();

    expect(modal.props('isExpanded')).toBe(true);
    wrapper.unmount();
  });

  it('hides the open action without a target route', () => {
    const wrapper = mountDialog({ to: undefined });

    expect(wrapper.find('.entity-info-open').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows tabs and a centered mode switch for a known entity', async () => {
    const wrapper = mountDialog({
      entityKind: 'character',
      entityId: 'c1',
    });
    await flushPromises();
    const modal = wrapper.findComponent(BaseModalStub);

    expect(modal.props('tabs')).toHaveLength(2);
    expect(wrapper.find('.entity-dialog-mode-switch').exists()).toBe(true);

    await wrapper.find('.entity-edit-mode').trigger('click');
    expect(wrapper.findComponent(EntityInlineEditorStub).exists()).toBe(true);

    wrapper
      .findComponent(EntityInlineEditorStub)
      .vm.$emit('update:title', 'Aria the Ranger');
    await wrapper.find('.entity-view-mode').trigger('click');
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        name: 'Aria the Ranger',
        notes: 'Ranger',
      }),
    );
    wrapper.unmount();
  });

  it('allows saving a note with text but no title', async () => {
    const wrapper = mountDialog({
      entityKind: 'note',
      entityId: 'c1',
    });
    await flushPromises();

    await wrapper.find('.entity-edit-mode').trigger('click');
    wrapper.findComponent(EntityInlineEditorStub).vm.$emit('update:title', '');

    await wrapper.find('.entity-view-mode').trigger('click');
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ name: '', notes: 'Ranger' }),
    );
    wrapper.unmount();
  });

  it('shows note options and the visual editor toggle while editing', async () => {
    const wrapper = mountDialog({
      entityKind: 'note',
      entityId: 'c1',
    });
    await flushPromises();

    await wrapper.find('.entity-edit-mode').trigger('click');
    await flushPromises();

    expect(wrapper.find('.note-options-button').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'QToggle' }).exists()).toBe(true);

    wrapper.findComponent({ name: 'NoteOptions' }).vm.$emit('update:note', {
      ...entity,
      typeId: 'type-1',
      tags: ['forest'],
    });
    await wrapper.find('.entity-view-mode').trigger('click');
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        typeId: 'type-1',
        tags: ['forest'],
      }),
    );
    wrapper.unmount();
  });

  it('omits tabs and editing for entities without a kind', () => {
    const wrapper = mountDialog();
    const modal = wrapper.findComponent(BaseModalStub);

    expect(modal.props('tabs')).toBeUndefined();
    expect(wrapper.find('.entity-dialog-mode-switch').exists()).toBe(false);
    wrapper.unmount();
  });
});
