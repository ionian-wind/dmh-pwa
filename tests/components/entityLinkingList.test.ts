import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import EntityLinkingList from '@/components/common/EntityLinkingList.vue';

const EntityCreateDialogStub = defineComponent({
  name: 'EntityCreateDialog',
  props: { kind: String },
  emits: ['created', 'cancel'],
  setup: () => () => h('div', { class: 'entity-create-dialog-stub' }),
});

const options = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
];

function mountList(props: Record<string, unknown> = {}) {
  return mount(EntityLinkingList, {
    props: { options, modelValue: [], ...props },
    global: { stubs: { EntityCreateDialog: EntityCreateDialogStub } },
  });
}

function optionRows(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAll('.entity-option')
    .filter((row) => ['Alpha', 'Beta'].includes(row.text()));
}

describe('EntityLinkingList', () => {
  it('toggles multiple options and filters by search', async () => {
    const wrapper = mountList();

    await optionRows(wrapper)[0].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['a']]);

    await optionRows(wrapper)[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([['a', 'b']]);

    await wrapper.find('input').setValue('beta');
    expect(optionRows(wrapper)).toHaveLength(1);
    wrapper.unmount();
  });

  it('replaces the selection when multiple is false', async () => {
    const wrapper = mountList({ multiple: false });

    await optionRows(wrapper)[0].trigger('click');
    await optionRows(wrapper)[1].trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[['a']], [['b']]]);
    wrapper.unmount();
  });

  it('creates and selects an entity when a creatable kind is provided', async () => {
    const wrapper = mountList({ kind: 'note', multiple: false });

    await wrapper.find('button[aria-label="Create"]').trigger('click');
    const createDialog = wrapper.findComponent(EntityCreateDialogStub);
    expect(createDialog.exists()).toBe(true);
    expect(createDialog.props('kind')).toBe('note');

    createDialog.vm.$emit('created', {
      ref: { kind: 'note', id: 'n3' },
      label: 'Gamma note',
    });

    expect(wrapper.emitted('update:modelValue')).toEqual([[['n3']]]);
    expect(wrapper.emitted('created')?.[0]).toEqual([
      { ref: { kind: 'note', id: 'n3' }, label: 'Gamma note' },
    ]);
    wrapper.unmount();
  });
});
