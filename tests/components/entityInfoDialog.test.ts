import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouter: () => ({ push: mocks.push }),
}));

import EntityInfoDialog from '@/components/common/EntityInfoDialog.vue';

const BaseModalStub = defineComponent({
  name: 'BaseModal',
  props: {
    isOpen: Boolean,
    title: String,
    showExpand: Boolean,
    isExpanded: Boolean,
  },
  emits: ['cancel', 'update:isExpanded'],
  setup(_, { slots }) {
    return () =>
      h('div', { class: 'base-modal-stub' }, [
        slots['header-actions']?.(),
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
      },
    },
  });
}

describe('EntityInfoDialog', () => {
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
});
