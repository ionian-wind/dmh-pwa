import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import BulkLinkingModal from '@/jukebox/components/BulkLinkingModal.vue';

const BaseModalStub = defineComponent({
  name: 'BaseModal',
  props: {
    isOpen: Boolean,
    modalId: String,
    title: String,
    showSubmit: Boolean,
    showCancel: Boolean,
    submitLabel: String,
    cancelLabel: String,
  },
  emits: ['submit', 'cancel', 'update:isOpen'],
  setup(props, { emit, slots }) {
    return () =>
      h(
        'div',
        {
          class: 'base-modal-stub',
          'data-open': String(props.isOpen),
          'data-id': props.modalId,
          'data-title': props.title,
        },
        [
          slots.default?.(),
          h('button', {
            class: 'modal-submit',
            onClick: () => emit('submit'),
          }),
          h('button', {
            class: 'modal-cancel',
            onClick: () => emit('cancel'),
          }),
          h('button', {
            class: 'modal-close',
            onClick: () => emit('update:isOpen', false),
          }),
        ],
      );
  },
});

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: {
    kind: String,
    modelValue: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'entities-stub', 'data-kind': props.kind }, [
        h('button', {
          class: 'add-link',
          onClick: () =>
            emit('update:modelValue', [
              ...props.modelValue,
              { kind: props.kind, id: 'm3' },
            ]),
        }),
      ]);
  },
});

function mountModal(props = {}) {
  return mount(BulkLinkingModal, {
    props: {
      modelValue: false,
      title: 'Edit selected',
      kind: 'module',
      links: [],
      ...props,
    },
    global: {
      stubs: {
        BaseModal: BaseModalStub,
        EntitiesLinking: EntitiesLinkingStub,
      },
    },
  });
}

describe('BulkLinkingModal', () => {
  it('copies links when opened and emits saved links', async () => {
    const links = [{ kind: 'module' as const, id: 'm1' }];
    const wrapper = mountModal({ links });

    const modal = wrapper.findComponent(BaseModalStub);
    expect(modal.props()).toMatchObject({
      isOpen: false,
      modalId: 'jukebox-bulk-linking-module',
      title: 'Edit selected',
      showSubmit: true,
      showCancel: true,
    });
    expect(
      wrapper.findComponent(EntitiesLinkingStub).props('modelValue'),
    ).toEqual([]);

    await wrapper.setProps({ modelValue: true });
    expect(
      wrapper.findComponent(EntitiesLinkingStub).props('modelValue'),
    ).toEqual(links);

    await wrapper.setProps({
      links: [...links, { kind: 'module', id: 'm2' }],
    });
    expect(
      wrapper.findComponent(EntitiesLinkingStub).props('modelValue'),
    ).toEqual([
      { kind: 'module', id: 'm1' },
      { kind: 'module', id: 'm2' },
    ]);

    await wrapper.find('.add-link').trigger('click');
    await wrapper.find('.modal-submit').trigger('click');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual([
      { kind: 'module', id: 'm1' },
      { kind: 'module', id: 'm2' },
      { kind: 'module', id: 'm3' },
    ]);
  });

  it('ignores link updates while closed and closes from cancel/update', async () => {
    const wrapper = mountModal({
      links: [{ kind: 'playlist', id: 'p1' }],
    });

    await wrapper.setProps({
      links: [{ kind: 'playlist', id: 'p2' }],
    });
    expect(
      wrapper.findComponent(EntitiesLinkingStub).props('modelValue'),
    ).toEqual([]);

    await wrapper.find('.modal-cancel').trigger('click');
    await wrapper.find('.modal-close').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [false]]);
  });
});
